import { FakePaymentProvider, signFakeEvent } from './fake-payment.provider';
import { InvalidSignatureError } from './payment-provider';

const request = (paymentMethod: string, idempotencyKey = 'k1') => ({
  orderId: 'o1',
  amountCents: 1000,
  currency: 'USD',
  paymentMethod,
  idempotencyKey,
});

describe('FakePaymentProvider', () => {
  const provider = new FakePaymentProvider();

  it.each([
    ['pm_card_visa', 'succeeded'],
    ['pm_card_chargeDeclined', 'declined'],
    ['pm_card_pending', 'pending'],
  ])('%s gives %s', async (method, status) => {
    const result = await provider.charge(request(method, `key-${method}`));
    expect(result.status).toBe(status);
    expect(result.reference).toMatch(/^fake_pi_/);
  });

  it('answers a repeated idempotency key with the first result', async () => {
    const first = await provider.charge(request('pm_card_visa', 'same'));
    const second = await provider.charge(request('pm_card_visa', 'same'));
    expect(second).toEqual(first);
  });

  describe('events', () => {
    const body = Buffer.from(
      JSON.stringify({
        id: 'evt_1',
        type: 'payment.succeeded',
        orderId: 'o1',
        reference: 'ref1',
      }),
    );

    it('reads an event with a good signature', () => {
      expect(provider.readEvent(body, signFakeEvent(body))).toEqual({
        id: 'evt_1',
        type: 'succeeded',
        orderId: 'o1',
        reference: 'ref1',
      });
    });

    it.each([undefined, '', 'abc', signFakeEvent(body, 'another-secret')])(
      'refuses the signature %p',
      (signature) => {
        expect(() => provider.readEvent(body, signature)).toThrow(
          InvalidSignatureError,
        );
      },
    );

    it('refuses a body that changed after it was signed', () => {
      const signature = signFakeEvent(body);
      expect(() =>
        provider.readEvent(Buffer.from(`${body.toString()} `), signature),
      ).toThrow(InvalidSignatureError);
    });

    it('ignores event types it does not know', () => {
      const other = Buffer.from(JSON.stringify({ id: 'e2', type: 'x' }));
      expect(provider.readEvent(other, signFakeEvent(other)).type).toBe(
        'ignored',
      );
    });
  });
});
