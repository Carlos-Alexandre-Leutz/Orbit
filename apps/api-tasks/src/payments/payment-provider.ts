/** What the store asks a payment provider to charge. */
export interface ChargeRequest {
  orderId: string;
  amountCents: number;
  currency: string;
  /** A test payment method such as `pm_card_visa`; the customer never types a card number into Orbit. */
  paymentMethod: string;
  /** The same key must never charge twice, even if the call is repeated. */
  idempotencyKey: string;
}

export interface ChargeResult {
  /** `pending` means the provider will confirm later, by a webhook event. */
  status: 'succeeded' | 'pending' | 'declined';
  reference: string;
  reason?: string;
}

/** A provider event, reduced to what the store needs. */
export interface PaymentEvent {
  id: string;
  type: 'succeeded' | 'failed' | 'ignored';
  orderId?: string;
  reference?: string;
}

export class InvalidSignatureError extends Error {
  constructor() {
    super('Invalid webhook signature');
  }
}

/**
 * The port: everything the store needs from a payment provider, and nothing of how it works. The Stripe
 * adapter and the fake used in tests and development both implement it.
 */
export abstract class PaymentProvider {
  abstract charge(request: ChargeRequest): Promise<ChargeResult>;

  /** Checks the signature on the raw body and reads the event. Throws `InvalidSignatureError`. */
  abstract readEvent(
    rawBody: Buffer,
    signature: string | undefined,
  ): PaymentEvent;
}
