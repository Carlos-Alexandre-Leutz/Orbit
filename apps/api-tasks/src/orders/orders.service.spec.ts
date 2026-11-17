import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

const product = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  sku: 'KIT-1',
  name: 'Skillet',
  priceCents: 3490,
  stock: 10,
  active: true,
  ...over,
});

const ADDRESS = {
  recipientName: 'Ana Souza',
  recipientPhone: '68 99999-0000',
  postalCode: '69900-000',
  street: 'Rua das Flores',
  number: '10',
  district: 'Centro',
  city: 'Rio Branco',
  state: 'AC',
};

describe('OrdersService', () => {
  const tx = {
    $queryRaw: jest.fn(),
    cartItem: { findMany: jest.fn(), deleteMany: jest.fn() },
    product: { updateMany: jest.fn(), update: jest.fn() },
    order: { create: jest.fn(), updateMany: jest.fn() },
    store: { findUniqueOrThrow: jest.fn() },
  };
  const payments = { refundOrder: jest.fn() };
  const mail = { sendOrderConfirmation: jest.fn() };
  const prisma = {
    cart: { findUnique: jest.fn() },
    storeCustomer: { upsert: jest.fn() },
    user: { findUnique: jest.fn() },
    order: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const service = new OrdersService(
    prisma as never,
    payments as never,
    mail as never,
  );
  const code = async (promise: Promise<unknown>) =>
    (
      (await promise.catch((e: unknown) => e)) as ConflictException
    ).getResponse();

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    prisma.cart.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.user.findUnique.mockResolvedValue({
      email: 'ana@example.com',
      isAnonymous: false,
    });
    mail.sendOrderConfirmation.mockResolvedValue(undefined);
    tx.store.findUniqueOrThrow.mockResolvedValue({
      shippingFlatCents: 0,
      freeShippingOverCents: null,
      pickupEnabled: false,
      handlingDays: 1,
      deliveryDaysMin: 3,
      deliveryDaysMax: 7,
      deliveryByState: {},
    });
    tx.product.updateMany.mockResolvedValue({ count: 1 });
    tx.order.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'o1',
        status: 'PENDING_PAYMENT',
        currency: 'USD',
        ...data,
        items: data.items.create,
      }),
    );
  });

  describe('createFromCart', () => {
    it('refuses an empty cart, with or without a cart row', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      expect(
        await code(
          service.createFromCart('u1', 's1', undefined, 'SHIPPING', ADDRESS),
        ),
      ).toMatchObject({
        code: 'EMPTY_CART',
      });
      prisma.cart.findUnique.mockResolvedValue({ id: 'c1' });
      tx.cartItem.findMany.mockResolvedValue([]);
      expect(
        await code(
          service.createFromCart('u1', 's1', undefined, 'SHIPPING', ADDRESS),
        ),
      ).toMatchObject({
        code: 'EMPTY_CART',
      });
    });

    it('copies the products and prices, totals them, takes the stock and empties the cart', async () => {
      tx.cartItem.findMany.mockResolvedValue([
        { quantity: 2, product: product() },
        {
          quantity: 1,
          product: product({
            id: 'p2',
            sku: 'B',
            name: 'Board',
            priceCents: 500,
          }),
        },
      ]);
      const order = await service.createFromCart(
        'u1',
        's1',
        undefined,
        'SHIPPING',
        ADDRESS,
      );
      expect(order.totalCents).toBe(2 * 3490 + 500);
      expect(
        order.items.map((i) => [
          i.sku,
          i.priceCents,
          i.quantity,
          i.lineTotalCents,
        ]),
      ).toEqual([
        ['KIT-1', 3490, 2, 6980],
        ['B', 500, 1, 500],
      ]);
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', active: true, stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'c1' },
      });
    });

    it('locks the cart and reads the lines in a fixed order so two orders cannot deadlock', async () => {
      tx.cartItem.findMany.mockResolvedValue([
        { quantity: 1, product: product() },
      ]);
      await service.createFromCart('u1', 's1', undefined, 'SHIPPING', ADDRESS);
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(tx.cartItem.findMany.mock.calls[0][0].orderBy).toEqual({
        productId: 'asc',
      });
    });

    it('refuses a removed product without touching the stock or the cart', async () => {
      tx.cartItem.findMany.mockResolvedValue([
        { quantity: 1, product: product({ active: false }) },
      ]);
      expect(
        await code(
          service.createFromCart('u1', 's1', undefined, 'SHIPPING', ADDRESS),
        ),
      ).toMatchObject({
        code: 'UNAVAILABLE',
      });
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.order.create).not.toHaveBeenCalled();
      expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
    });

    it('refuses when the stock cannot be taken, and creates nothing (the transaction rolls back)', async () => {
      tx.cartItem.findMany.mockResolvedValue([
        { quantity: 3, product: product() },
      ]);
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      expect(
        await code(
          service.createFromCart('u1', 's1', undefined, 'SHIPPING', ADDRESS),
        ),
      ).toMatchObject({
        code: 'NOT_ENOUGH_STOCK',
        productId: 'p1',
      });
      expect(tx.order.create).not.toHaveBeenCalled();
      expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('listMine', () => {
    it('keeps only the orders of one store when it is given one', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      await service.listMine('u1');
      expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({
        userId: 'u1',
      });
      await service.listMine('u1', 's1');
      expect(prisma.order.findMany.mock.calls[1][0].where).toEqual({
        userId: 'u1',
        storeId: 's1',
      });
    });
  });

  describe('get', () => {
    const order = {
      id: 'o1',
      userId: 'owner',
      storeId: 's1',
      status: 'PAID',
      currency: 'USD',
      totalCents: 1,
      items: [],
    };

    it('shows an order to its owner, to an admin and to the seller of its store', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      await expect(
        service.get('o1', { id: 'owner', role: 'CUSTOMER' }),
      ).resolves.toMatchObject({ id: 'o1' });
      await expect(
        service.get('o1', { id: 'boss', role: 'ADMIN' }),
      ).resolves.toMatchObject({ id: 'o1' });
      await expect(
        service.get('o1', { id: 'sam', role: 'SELLER', storeId: 's1' }),
      ).resolves.toMatchObject({ id: 'o1' });
    });

    it('does not reveal the order to anyone else, not even the seller of another store', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      for (const viewer of [
        { id: 'other', role: 'CUSTOMER' as const },
        { id: 'rival', role: 'SELLER' as const, storeId: 's2' },
      ]) {
        await expect(service.get('o1', viewer)).rejects.toBeInstanceOf(
          NotFoundException,
        );
      }
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.get('nope', { id: 'owner', role: 'CUSTOMER' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('transition', () => {
    beforeEach(() => {
      prisma.order.findUniqueOrThrow.mockResolvedValue({
        id: 'o1',
        status: 'SHIPPED',
        items: [],
      });
    });

    const sam = { id: 'sam', role: 'SELLER' as const, storeId: 's1' };

    it('moves an allowed order, naming the state it expects, and stamps the time', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        storeId: 's1',
        status: 'PAID',
      });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });
      await service.transition('o1', 'SHIPPED', sam);
      const args = prisma.order.updateMany.mock.calls[0][0];
      expect(args.where).toEqual({ id: 'o1', status: 'PAID' });
      expect(args.data.status).toBe('SHIPPED');
      expect(args.data.shippedAt).toBeInstanceOf(Date);
    });

    it('refuses a move that is not allowed and writes nothing', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        storeId: 's1',
        status: 'PENDING_PAYMENT',
      });
      expect(
        await code(service.transition('o1', 'SHIPPED', sam)),
      ).toMatchObject({
        code: 'INVALID_TRANSITION',
      });
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('loses gracefully when another request moved the order first', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        storeId: 's1',
        status: 'PAID',
      });
      prisma.order.updateMany.mockResolvedValue({ count: 0 });
      expect(
        await code(service.transition('o1', 'SHIPPED', sam)),
      ).toMatchObject({
        code: 'STATE_CHANGED',
      });
    });

    it("treats another store's order as missing for a seller, and lets an admin through", async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        storeId: 's2',
        status: 'PAID',
      });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });
      await expect(
        service.transition('o1', 'SHIPPED', sam),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
      await service.transition('o1', 'SHIPPED', { id: 'boss', role: 'ADMIN' });
      expect(prisma.order.updateMany).toHaveBeenCalledTimes(1);
    });

    it('answers not found for an unknown order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.transition('o1', 'SHIPPED', sam),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('confirmation e-mail', () => {
    const lines = () =>
      tx.cartItem.findMany.mockResolvedValue([
        { product: product(), quantity: 1 },
      ]);
    const flush = () => new Promise((resolve) => setImmediate(resolve));

    it('is sent to the owner once the order is saved', async () => {
      lines();
      const order = await service.createFromCart(
        'u1',
        's1',
        undefined,
        'SHIPPING',
        ADDRESS,
      );
      await flush();
      expect(mail.sendOrderConfirmation).toHaveBeenCalledWith(
        'ana@example.com',
        expect.objectContaining({ id: order.id }),
      );
    });

    it('never fails the order when the mail server is down', async () => {
      lines();
      mail.sendOrderConfirmation.mockRejectedValue(new Error('ECONNREFUSED'));
      const order = await service.createFromCart(
        'u1',
        's1',
        undefined,
        'SHIPPING',
        ADDRESS,
      );
      await flush();
      expect(order.id).toBe('o1');
    });

    it('never waits for a slow mail server', async () => {
      lines();
      mail.sendOrderConfirmation.mockReturnValue(new Promise(() => undefined));
      await expect(
        service.createFromCart('u1', 's1', undefined, 'SHIPPING', ADDRESS),
      ).resolves.toMatchObject({
        id: 'o1',
      });
    });

    it('is not sent to a temporary visitor', async () => {
      lines();
      prisma.user.findUnique.mockResolvedValue({
        email: 'anon-1@anonymous.orbit.invalid',
        isAnonymous: true,
      });
      await service.createFromCart('u1', 's1', undefined, 'SHIPPING', ADDRESS);
      await flush();
      expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
    });

    it('is not sent again when a retry returns the order that already exists', async () => {
      lines();
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        items: [],
        totalCents: 1,
      });
      await service.createFromCart(
        'u1',
        's1',
        'checkout-1234abcd',
        'SHIPPING',
        ADDRESS,
      );
      await flush();
      expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    const ana = { id: 'u1', role: 'CUSTOMER' as const };
    const sam = { id: 'sam', role: 'SELLER' as const, storeId: 's1' };
    const order = (status: string, over: object = {}) => ({
      id: 'o1',
      userId: 'u1',
      storeId: 's1',
      status,
      refundRef: null,
      items: [
        { productId: 'p2', quantity: 1 },
        { productId: 'p1', quantity: 3 },
      ],
      ...over,
    });
    const found = (status: string, over: object = {}) => {
      prisma.order.findUnique.mockResolvedValue(order(status, over));
      prisma.order.findUniqueOrThrow.mockResolvedValue(order('CANCELLED'));
      tx.order.updateMany.mockResolvedValue({ count: 1 });
    };

    it('lets the owner cancel an unpaid order and returns the stock, in product order', async () => {
      found('PENDING_PAYMENT');
      await service.cancel('o1', ana);
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'o1', status: 'PENDING_PAYMENT' },
        data: { status: 'CANCELLED', cancelledAt: expect.any(Date) },
      });
      expect(tx.product.update.mock.calls.map((c) => c[0])).toEqual([
        { where: { id: 'p1' }, data: { stock: { increment: 3 } } },
        { where: { id: 'p2' }, data: { stock: { increment: 1 } } },
      ]);
      expect(payments.refundOrder).not.toHaveBeenCalled();
    });

    it('refuses a customer cancelling a paid order, with a code, and changes nothing', async () => {
      found('PAID');
      const error = (await service
        .cancel('o1', ana)
        .catch((e: unknown) => e)) as { getResponse(): unknown };
      expect(error.getResponse()).toMatchObject({ code: 'CANCEL_NEEDS_STAFF' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('lets a seller cancel a paid order and refunds it after the state change', async () => {
      found('PAID');
      await service.cancel('o1', sam);
      expect(tx.product.update).toHaveBeenCalledTimes(2);
      expect(payments.refundOrder).toHaveBeenCalledWith('o1');
    });

    it.each(['SHIPPED', 'DELIVERED'])(
      'refuses a %s order for everyone',
      async (status) => {
        found(status);
        for (const viewer of [ana, sam]) {
          expect(await code(service.cancel('o1', viewer))).toMatchObject({
            code: 'INVALID_TRANSITION',
          });
        }
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it("treats someone else's order as missing for a customer", async () => {
      found('PENDING_PAYMENT');
      await expect(
        service.cancel('o1', { id: 'intruder', role: 'CUSTOMER' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("treats another store's order as missing for a seller", async () => {
      found('PAID');
      await expect(
        service.cancel('o1', { id: 'rival', role: 'SELLER', storeId: 's2' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns the stock only for the request that won the state change', async () => {
      found('PENDING_PAYMENT');
      tx.order.updateMany.mockResolvedValue({ count: 0 });
      expect(await code(service.cancel('o1', ana))).toMatchObject({
        code: 'STATE_CHANGED',
      });
      expect(tx.product.update).not.toHaveBeenCalled();
    });

    it('does nothing again for a cancelled order, except retrying a missing refund for staff', async () => {
      found('CANCELLED');
      await service.cancel('o1', ana);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(payments.refundOrder).not.toHaveBeenCalled();
      await service.cancel('o1', sam);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(payments.refundOrder).toHaveBeenCalledTimes(1);
    });

    it('keeps the order cancelled and answers 502 when the refund fails', async () => {
      found('PAID');
      payments.refundOrder.mockRejectedValue(new Error('provider down'));
      const error = (await service
        .cancel('o1', sam)
        .catch((e: unknown) => e)) as {
        getStatus(): number;
        getResponse(): unknown;
      };
      expect(error.getStatus()).toBe(502);
      expect(error.getResponse()).toMatchObject({ code: 'REFUND_FAILED' });
      expect(tx.product.update).toHaveBeenCalledTimes(2);
    });
  });
});
