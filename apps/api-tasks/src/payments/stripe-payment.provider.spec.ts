import Stripe from 'stripe';
import { InvalidSignatureError } from './payment-provider';
import { StripePaymentProvider } from './stripe-payment.provider';

/** Without Stripe keys only the webhook signature can be checked for real: Stripe's own helper signs the test payloads. */
describe('StripePaymentProvider webhook', () => {
  const secret = 'whsec_test_secret';
  const provider = new StripePaymentProvider('sk_test_not_a_real_key', secret);
  const stripe = new Stripe('sk_test_not_a_real_key');
  const signed = (event: object, withSecret = secret) => {
    const payload = JSON.stringify(event);
    return {
      payload: Buffer.from(payload),
      header: stripe.webhooks.generateTestHeaderString({
        payload,
        secret: withSecret,
      }),
    };
  };
  const intentEvent = (type: string) => ({
    id: 'evt_123',
    object: 'event',
    type,
    data: {
      object: {
        id: 'pi_123',
        object: 'payment_intent',
        metadata: { orderId: 'o1' },
      },
    },
  });

  it('reads a succeeded payment and the order it names', () => {
    const { payload, header } = signed(intentEvent('payment_intent.succeeded'));
    expect(provider.readEvent(payload, header)).toEqual({
      id: 'evt_123',
      type: 'succeeded',
      orderId: 'o1',
      reference: 'pi_123',
    });
  });

  it('reads a failed payment', () => {
    const { payload, header } = signed(
      intentEvent('payment_intent.payment_failed'),
    );
    expect(provider.readEvent(payload, header).type).toBe('failed');
  });

  it('ignores other event types', () => {
    const { payload, header } = signed(intentEvent('charge.refunded'));
    expect(provider.readEvent(payload, header)).toEqual({
      id: 'evt_123',
      type: 'ignored',
    });
  });

  it('refuses a wrong secret, a missing header and an altered body', () => {
    const good = signed(intentEvent('payment_intent.succeeded'));
    const wrong = signed(
      intentEvent('payment_intent.succeeded'),
      'whsec_other',
    );
    expect(() => provider.readEvent(wrong.payload, wrong.header)).toThrow(
      InvalidSignatureError,
    );
    expect(() => provider.readEvent(good.payload, undefined)).toThrow(
      InvalidSignatureError,
    );
    expect(() =>
      provider.readEvent(
        Buffer.from(`${good.payload.toString()} `),
        good.header,
      ),
    ).toThrow(InvalidSignatureError);
  });
});
