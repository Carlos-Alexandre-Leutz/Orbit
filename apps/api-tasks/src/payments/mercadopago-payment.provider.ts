import {
  correlationHeaders,
  correlationMetadata,
} from '../correlation/correlation';
import {
  ChargeRequest,
  ChargeResult,
  InvalidSignatureError,
  PaymentEvent,
  PaymentProvider,
  RefundRequest,
  WebhookExtra,
} from './payment-provider';
import { isValidMercadoPagoSignature } from './mercadopago-signature';

const API = 'https://api.mercadopago.com';

type Fetch = typeof fetch;

interface MercadoPagoPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
}

/**
 * The Mercado Pago adapter, for the seller's own account (`accessToken` is theirs). Written from the public
 * API documentation and never run against Mercado Pago: no account was available. The card is read in the
 * browser by Mercado Pago's own script, which gives a one-time token; only the token reaches Orbit.
 */
export class MercadoPagoPaymentProvider extends PaymentProvider {
  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret: string,
    private readonly http: Fetch = fetch,
  ) {
    super();
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: object,
    idempotencyKey?: string,
  ): Promise<{ ok: boolean; status: number; data: T }> {
    const response = await this.http(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
        ...correlationHeaders(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await response.json().catch(() => ({}))) as T;
    return { ok: response.ok, status: response.status, data };
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (!request.cardToken || !request.cardBrand || !request.payerEmail) {
      return {
        status: 'declined',
        reference: '',
        reason: 'The card details are incomplete',
      };
    }
    const result = await this.call<MercadoPagoPayment & { message?: string }>(
      'POST',
      '/v1/payments',
      {
        transaction_amount: request.amountCents / 100,
        token: request.cardToken,
        installments: 1,
        payment_method_id: request.cardBrand,
        payer: { email: request.payerEmail },
        description: `Order ${request.orderId}`,
        external_reference: request.orderId,
        metadata: { orderId: request.orderId, ...correlationMetadata() },
      },
      request.idempotencyKey,
    );
    if (!result.ok) {
      if (result.status >= 500) {
        throw new Error(`Mercado Pago answered ${result.status}`);
      }
      return {
        status: 'declined',
        reference: '',
        reason: result.data.message ?? `Mercado Pago answered ${result.status}`,
      };
    }
    const reference = String(result.data.id);
    if (result.data.status === 'approved') {
      return { status: 'succeeded', reference };
    }
    if (
      result.data.status === 'in_process' ||
      result.data.status === 'pending'
    ) {
      return { status: 'pending', reference };
    }
    return {
      status: 'declined',
      reference,
      reason: result.data.status_detail ?? `Payment ${result.data.status}`,
    };
  }

  async refund(request: RefundRequest): Promise<{ reference: string }> {
    const result = await this.call<{ id?: number | string; message?: string }>(
      'POST',
      `/v1/payments/${encodeURIComponent(request.paymentReference)}/refunds`,
      { amount: request.amountCents / 100 },
      request.idempotencyKey,
    );
    if (!result.ok || result.data.id === undefined) {
      throw new Error(
        `Mercado Pago refund failed: ${result.data.message ?? result.status}`,
      );
    }
    return { reference: String(result.data.id) };
  }

  /**
   * Mercado Pago signs `id:<payment id>;request-id:<x-request-id>;ts:<ts>;` and sends only the payment id in
   * the notification, so after the signature is checked the payment is read from Mercado Pago itself: what
   * the notification claims is never trusted.
   */
  async readEvent(
    rawBody: Buffer,
    signature: string | undefined,
    extra?: WebhookExtra,
  ): Promise<PaymentEvent> {
    let body: { type?: string; data?: { id?: string | number } } = {};
    try {
      body = JSON.parse(rawBody.toString('utf8')) as typeof body;
    } catch {
      throw new InvalidSignatureError();
    }
    const rawId = extra?.query['data.id'] ?? body.data?.id;
    const dataId = rawId === undefined ? '' : String(rawId);
    if (
      !isValidMercadoPagoSignature(
        this.webhookSecret,
        signature,
        extra?.headers['x-request-id'],
        dataId,
      )
    ) {
      throw new InvalidSignatureError();
    }
    if ((extra?.query.type ?? body.type) !== 'payment' || !dataId) {
      return { id: `mp-ignored-${dataId}`, type: 'ignored' };
    }
    const payment = await this.call<MercadoPagoPayment>(
      'GET',
      `/v1/payments/${encodeURIComponent(dataId)}`,
    );
    if (!payment.ok) {
      throw new Error(`Mercado Pago answered ${payment.status}`);
    }
    const { status, external_reference: orderId } = payment.data;
    const id = `mp-${payment.data.id}-${status}`;
    if (status === 'approved') {
      return {
        id,
        type: 'succeeded',
        orderId,
        reference: String(payment.data.id),
      };
    }
    if (status === 'rejected' || status === 'cancelled') {
      return {
        id,
        type: 'failed',
        orderId,
        reference: String(payment.data.id),
      };
    }
    return { id, type: 'ignored' };
  }
}
