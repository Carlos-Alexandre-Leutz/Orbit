import { HttpException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ChargeResult, PaymentProvider } from './payment-provider';

const order = (over: object = {}) => ({
  id: 'o1',
  userId: 'u1',
  status: 'PENDING_PAYMENT',
  currency: 'USD',
  totalCents: 5000,
  items: [],
  paidAt: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  createdAt: new Date(),
  ...over,
});

describe('PaymentsService.pay', () => {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const provider = {
    charge: jest.fn(),
    refund: jest.fn(),
    readEvent: jest.fn(),
  };
  const service = new PaymentsService(
    prisma as never,
    provider as unknown as PaymentProvider,
  );
  const charge = (result: ChargeResult) =>
    provider.charge.mockResolvedValue(result);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.order.findUnique.mockResolvedValue(order());
    prisma.order.findUniqueOrThrow.mockResolvedValue(order({ status: 'PAID' }));
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
  });

  it('charges the stored total and marks the order paid', async () => {
    charge({ status: 'succeeded', reference: 'ref1' });
    const paid = await service.pay('o1', 'u1', 'pm_card_visa');
    expect(provider.charge).toHaveBeenCalledWith({
      orderId: 'o1',
      amountCents: 5000,
      currency: 'USD',
      paymentMethod: 'pm_card_visa',
      idempotencyKey: 'order-o1-pm_card_visa',
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', status: 'PENDING_PAYMENT' },
      data: expect.objectContaining({ status: 'PAID', paymentRef: 'ref1' }),
    });
    expect(paid.status).toBe('PAID');
  });

  it('does not charge an order that is already paid', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'PAID' }));
    expect((await service.pay('o1', 'u1')).status).toBe('PAID');
    expect(provider.charge).not.toHaveBeenCalled();
  });

  it.each(['SHIPPED', 'DELIVERED', 'CANCELLED'])(
    'refuses a %s order',
    async (status) => {
      prisma.order.findUnique.mockResolvedValue(order({ status }));
      await expect(service.pay('o1', 'u1')).rejects.toMatchObject({
        response: { code: 'NOT_PAYABLE' },
      });
      expect(provider.charge).not.toHaveBeenCalled();
    },
  );

  it("treats someone else's order as missing", async () => {
    await expect(service.pay('o1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(provider.charge).not.toHaveBeenCalled();
  });

  it('answers 402 and leaves the order unpaid when the card is declined', async () => {
    charge({ status: 'declined', reference: 'r', reason: 'Card declined' });
    const error = await service.pay('o1', 'u1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(402);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('keeps a pending payment unpaid until the webhook confirms it', async () => {
    charge({ status: 'pending', reference: 'r' });
    prisma.order.findUniqueOrThrow.mockResolvedValue(order());
    expect((await service.pay('o1', 'u1')).status).toBe('PENDING_PAYMENT');
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });
});

describe('PaymentsService refunds', () => {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const provider = {
    charge: jest.fn(),
    refund: jest.fn(),
    readEvent: jest.fn(),
  };
  const service = new PaymentsService(
    prisma as never,
    provider as unknown as PaymentProvider,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    provider.refund.mockResolvedValue({ reference: 're1' });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
  });

  it('refunds the whole payment of an order once and records the refund', async () => {
    prisma.order.findUniqueOrThrow.mockResolvedValue(
      order({ paymentRef: 'pi1', refundRef: null }),
    );
    await service.refundOrder('o1');
    expect(provider.refund).toHaveBeenCalledWith({
      paymentReference: 'pi1',
      amountCents: 5000,
      idempotencyKey: 'refund-pi1',
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', refundRef: null },
      data: { refundRef: 're1' },
    });
  });

  it.each([
    ['was never paid', { paymentRef: null, refundRef: null }],
    ['was already refunded', { paymentRef: 'pi1', refundRef: 're0' }],
  ])('does nothing for an order that %s', async (_name, fields) => {
    prisma.order.findUniqueOrThrow.mockResolvedValue(order(fields));
    await service.refundOrder('o1');
    expect(provider.refund).not.toHaveBeenCalled();
  });

  it('refunds a charge that succeeded after the order was cancelled, and records it', async () => {
    prisma.order.findUnique
      .mockResolvedValueOnce(order())
      .mockResolvedValueOnce(order({ status: 'CANCELLED', paymentRef: null }));
    prisma.order.findUniqueOrThrow.mockResolvedValue(
      order({ status: 'CANCELLED' }),
    );
    provider.charge.mockResolvedValue({
      status: 'succeeded',
      reference: 'pi9',
    });
    prisma.order.updateMany
      .mockResolvedValueOnce({ count: 0 }) // the order no longer waits for payment
      .mockResolvedValueOnce({ count: 1 });
    await service.pay('o1', 'u1');
    expect(provider.refund).toHaveBeenCalledWith({
      paymentReference: 'pi9',
      amountCents: 5000,
      idempotencyKey: 'refund-pi9',
    });
    expect(prisma.order.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'o1', paymentRef: null },
      data: { paymentRef: 'pi9', refundRef: 're1' },
    });
  });

  it('does not refund the very payment that paid the order', async () => {
    prisma.order.findUnique
      .mockResolvedValueOnce(order())
      .mockResolvedValueOnce(order({ status: 'PAID', paymentRef: 'pi9' }));
    prisma.order.findUniqueOrThrow.mockResolvedValue(order({ status: 'PAID' }));
    provider.charge.mockResolvedValue({
      status: 'succeeded',
      reference: 'pi9',
    });
    prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
    await service.pay('o1', 'u1');
    expect(provider.refund).not.toHaveBeenCalled();
  });
});
