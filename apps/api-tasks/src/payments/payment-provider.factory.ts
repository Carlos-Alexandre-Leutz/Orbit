import { FakePaymentProvider } from './fake-payment.provider';
import { PaymentProvider } from './payment-provider';
import { StripePaymentProvider } from './stripe-payment.provider';
import { UnavailablePaymentProvider } from './unavailable-payment.provider';

/**
 * Stripe when its keys are set, the fake otherwise. The fake never runs in production: it would accept
 * every payment. In production without keys the platform has no provider of its own (each store connects
 * its own, see StorePaymentProviders), so this one refuses everything.
 */
export function createPaymentProvider(
  env: NodeJS.ProcessEnv = process.env,
): PaymentProvider {
  const key = env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (key && webhookSecret) {
    return new StripePaymentProvider(key, webhookSecret);
  }
  if (env.NODE_ENV === 'production') {
    return new UnavailablePaymentProvider();
  }
  return new FakePaymentProvider();
}
