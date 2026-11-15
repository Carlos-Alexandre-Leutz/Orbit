import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import {
  ChargeRequest,
  ChargeResult,
  InvalidSignatureError,
  PaymentEvent,
  PaymentProvider,
} from './payment-provider';

export const FAKE_WEBHOOK_SECRET = 'fake-webhook-secret';

/** Signs an event body the way the fake provider checks it: HMAC-SHA256 of the raw body, in hex. */
export function signFakeEvent(
  rawBody: string | Buffer,
  secret = FAKE_WEBHOOK_SECRET,
): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * A provider that charges nothing. The payment method decides the outcome, like Stripe's test cards:
 * `pm_card_chargeDeclined` is declined, `pm_card_pending` is confirmed later by a webhook, anything else
 * succeeds. Its webhooks are signed with a shared secret, so the whole webhook path can be exercised.
 */
export class FakePaymentProvider extends PaymentProvider {
  private readonly charged = new Map<string, ChargeResult>();

  constructor(private readonly secret = FAKE_WEBHOOK_SECRET) {
    super();
  }

  charge(request: ChargeRequest): Promise<ChargeResult> {
    const previous = this.charged.get(request.idempotencyKey);
    if (previous) {
      return Promise.resolve(previous);
    }
    const reference = `fake_pi_${randomUUID()}`;
    let result: ChargeResult;
    if (request.paymentMethod === 'pm_card_chargeDeclined') {
      result = { status: 'declined', reference, reason: 'Card declined' };
    } else if (request.paymentMethod === 'pm_card_pending') {
      result = { status: 'pending', reference };
    } else {
      result = { status: 'succeeded', reference };
    }
    this.charged.set(request.idempotencyKey, result);
    return Promise.resolve(result);
  }

  readEvent(rawBody: Buffer, signature: string | undefined): PaymentEvent {
    const expected = Buffer.from(signFakeEvent(rawBody, this.secret));
    const given = Buffer.from(signature ?? '');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new InvalidSignatureError();
    }
    const body = JSON.parse(rawBody.toString('utf8')) as {
      id: string;
      type: string;
      orderId?: string;
      reference?: string;
    };
    const type =
      body.type === 'payment.succeeded'
        ? 'succeeded'
        : body.type === 'payment.failed'
          ? 'failed'
          : 'ignored';
    return {
      id: body.id,
      type,
      orderId: body.orderId,
      reference: body.reference,
    };
  }
}
