import { FakePaymentProvider } from './fake-payment.provider';
import { createPaymentProvider } from './payment-provider.factory';
import { StripePaymentProvider } from './stripe-payment.provider';
import { UnavailablePaymentProvider } from './unavailable-payment.provider';

describe('createPaymentProvider', () => {
  it('uses the fake without keys, outside production', () => {
    expect(createPaymentProvider({})).toBeInstanceOf(FakePaymentProvider);
  });

  it('uses Stripe when both keys are set', () => {
    expect(
      createPaymentProvider({
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_WEBHOOK_SECRET: 'whsec_x',
      }),
    ).toBeInstanceOf(StripePaymentProvider);
  });

  it('keeps the fake when only one key is set', () => {
    expect(
      createPaymentProvider({ STRIPE_SECRET_KEY: 'sk_test_x' }),
    ).toBeInstanceOf(FakePaymentProvider);
  });

  it('never uses the fake in production without Stripe keys', () => {
    const provider = createPaymentProvider({ NODE_ENV: 'production' });
    expect(provider).toBeInstanceOf(UnavailablePaymentProvider);
    expect(provider).not.toBeInstanceOf(FakePaymentProvider);
  });
});
