import { FakePaymentProvider } from './fake-payment.provider';
import { PaymentProvider } from './payment-provider';
import { StripePaymentProvider } from './stripe-payment.provider';

/**
 * Stripe when its keys are set, the fake otherwise. The fake never runs in production: it would accept
 * every payment, so a production start without Stripe keys fails instead.
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
    throw new Error(
      'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required in production: the fake payment provider is for tests and development.',
    );
  }
  return new FakePaymentProvider();
}
