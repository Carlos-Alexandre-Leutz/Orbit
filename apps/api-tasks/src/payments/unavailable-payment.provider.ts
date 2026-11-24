import {
  ChargeResult,
  InvalidSignatureError,
  PaymentEvent,
  PaymentProvider,
} from './payment-provider';

/**
 * The platform-level provider in production when no Stripe keys are set: each store charges through its own
 * provider (ADR-008), so this one must refuse everything. It is never the fake, which would accept any payment.
 */
export class UnavailablePaymentProvider extends PaymentProvider {
  charge(): Promise<ChargeResult> {
    return Promise.reject(new Error('No platform payment provider is set'));
  }

  refund(): Promise<{ reference: string }> {
    return Promise.reject(new Error('No platform payment provider is set'));
  }

  readEvent(): PaymentEvent {
    throw new InvalidSignatureError();
  }
}
