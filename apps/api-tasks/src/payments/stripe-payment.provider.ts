import { correlationMetadata } from '../correlation/correlation';
import Stripe from 'stripe';
import {
  ChargeRequest,
  ChargeResult,
  InvalidSignatureError,
  PaymentEvent,
  PaymentProvider,
  RefundRequest,
} from './payment-provider';

/**
 * The Stripe adapter, for test mode. Only its webhook signature check is covered by tests that run
 * without keys; `charge` and `refund` have never run against Stripe because no key was available (see PBI-09).
 */
export class StripePaymentProvider extends PaymentProvider {
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    super();
    this.stripe = new Stripe(secretKey);
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: request.amountCents,
          currency: request.currency.toLowerCase(),
          payment_method: request.paymentMethod,
          confirm: true,
          // Cards only, no redirect: a card that needs extra authentication cannot finish here.
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
          metadata: { orderId: request.orderId, ...correlationMetadata() },
        },
        { idempotencyKey: request.idempotencyKey },
      );
      if (intent.status === 'succeeded') {
        return { status: 'succeeded', reference: intent.id };
      }
      if (intent.status === 'processing') {
        return { status: 'pending', reference: intent.id };
      }
      return {
        status: 'declined',
        reference: intent.id,
        reason: `Payment ${intent.status}`,
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        return {
          status: 'declined',
          reference: error.payment_intent?.id ?? '',
          reason: error.message,
        };
      }
      throw error;
    }
  }

  async refund(request: RefundRequest): Promise<{ reference: string }> {
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: request.paymentReference,
        amount: request.amountCents,
      },
      { idempotencyKey: request.idempotencyKey },
    );
    return { reference: refund.id };
  }

  readEvent(rawBody: Buffer, signature: string | undefined): PaymentEvent {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature ?? '',
        this.webhookSecret,
      );
    } catch {
      throw new InvalidSignatureError();
    }
    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed'
    ) {
      return { id: event.id, type: 'ignored' };
    }
    const intent = event.data.object;
    return {
      id: event.id,
      type: event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed',
      orderId: intent.metadata?.orderId,
      reference: intent.id,
    };
  }
}
