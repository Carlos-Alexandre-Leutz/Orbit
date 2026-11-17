import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isValidMercadoPagoSignature } from '../payments/mercadopago-signature';
import { InvalidSignatureError } from '../payments/payment-provider';
import { PlansService } from '../admin/plans.service';
import { hasBilling, TRIAL_DAYS } from './billing-rules';

const API = 'https://api.mercadopago.com';
const BILLING_SUSPENSION = 'billing:';

interface Preapproval {
  id: string;
  status: string;
  init_point?: string;
  external_reference?: string;
}

/**
 * The monthly subscription of each store, charged by Orbit's own Mercado Pago account (ADR-009): 30 free days,
 * then the plan price every month. The seller registers the card on Mercado Pago's own page, so no card number
 * ever reaches Orbit. Written from the public documentation and never run against Mercado Pago.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
  ) {}

  private config() {
    const token = process.env.ORBIT_BILLING_MP_ACCESS_TOKEN?.trim();
    const secret = process.env.ORBIT_BILLING_MP_WEBHOOK_SECRET?.trim();
    return token && secret ? { token, secret } : null;
  }

  private async mercadoPago<T>(
    method: 'GET' | 'POST',
    path: string,
    token: string,
    body?: object,
  ): Promise<T> {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await response.json().catch(() => ({}))) as T & {
      message?: string;
    };
    if (!response.ok) {
      this.logger.warn(`Mercado Pago answered ${response.status} on ${path}`);
      throw new ServiceUnavailableException(
        data.message ?? 'The billing provider did not accept the request',
      );
    }
    return data;
  }

  private async storeOf(userId: string) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: userId },
      include: { owner: { select: { email: true } } },
    });
    if (!store) throw new NotFoundException('This account has no store');
    return store;
  }

  /** What the seller sees about the subscription of their store. */
  async statusOf(userId: string) {
    const store = await this.storeOf(userId);
    return {
      configured: this.config() !== null,
      status: store.subscriptionStatus,
      trialEndsAt: store.trialEndsAt,
      canPublish: hasBilling(store),
      plan: await this.plans.get(),
      trialDays: TRIAL_DAYS,
    };
  }

  /** Creates the subscription and gives back the Mercado Pago page where the seller registers the card. */
  async start(userId: string) {
    const config = this.config();
    if (!config) {
      throw new ServiceUnavailableException(
        'Billing is not set up on this server yet',
      );
    }
    const store = await this.storeOf(userId);
    if (store.subscriptionStatus === 'authorized') {
      throw new ConflictException('Your subscription is already active');
    }
    const plan = await this.plans.get();
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const subscription = await this.mercadoPago<Preapproval>(
      'POST',
      '/preapproval',
      config.token,
      {
        reason: plan.name,
        external_reference: store.id,
        payer_email: store.owner.email,
        back_url: `${appUrl}/panel/billing`,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: plan.priceCents / 100,
          currency_id: plan.currency,
          free_trial: { frequency: TRIAL_DAYS, frequency_type: 'days' },
        },
      },
    );
    if (!subscription.init_point) {
      throw new ServiceUnavailableException(
        'The billing provider gave no page to register the card',
      );
    }
    await this.prisma.store.update({
      where: { id: store.id },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: 'pending',
      },
    });
    return { url: subscription.init_point };
  }

  /**
   * A notification from Mercado Pago. Only the subscription id is trusted from it: the signature is checked, then
   * the subscription is read from Mercado Pago itself. An authorized one starts the free days and lifts a billing
   * suspension; a cancelled or paused one (Mercado Pago gave up charging the card) suspends the store.
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    requestId: string | undefined,
    query: Record<string, string | undefined>,
  ) {
    const config = this.config();
    if (!config) throw new InvalidSignatureError();
    let body: { type?: string; data?: { id?: string | number } } = {};
    try {
      body = JSON.parse(rawBody.toString('utf8')) as typeof body;
    } catch {
      throw new InvalidSignatureError();
    }
    const rawId = query['data.id'] ?? body.data?.id;
    const dataId = rawId === undefined ? '' : String(rawId);
    if (
      !dataId ||
      !isValidMercadoPagoSignature(config.secret, signature, requestId, dataId)
    ) {
      throw new InvalidSignatureError();
    }
    if ((query.type ?? body.type) !== 'subscription_preapproval') return;

    const subscription = await this.mercadoPago<Preapproval>(
      'GET',
      `/preapproval/${encodeURIComponent(dataId)}`,
      config.token,
    );
    const store = subscription.external_reference
      ? await this.prisma.store.findUnique({
          where: { id: subscription.external_reference },
        })
      : null;
    if (!store || store.subscriptionId !== subscription.id) {
      this.logger.warn(`Subscription ${dataId} matches no store`);
      return;
    }
    const status = subscription.status;
    const billingSuspended =
      store.suspendedReason?.startsWith(BILLING_SUSPENSION) ?? false;
    await this.prisma.store.update({
      where: { id: store.id },
      data: {
        subscriptionStatus: status,
        ...(status === 'authorized'
          ? {
              trialEndsAt:
                store.trialEndsAt ??
                new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000),
              ...(billingSuspended
                ? { suspendedAt: null, suspendedReason: null }
                : {}),
            }
          : {}),
        ...((status === 'cancelled' || status === 'paused') &&
        !store.suspendedAt
          ? {
              suspendedAt: new Date(),
              suspendedReason: `${BILLING_SUSPENSION} subscription ${status}`,
            }
          : {}),
      },
    });
  }
}
