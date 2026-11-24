import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CartService } from './cart.service';

const product = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  sku: 'KIT-1',
  name: 'Skillet',
  priceCents: 3490,
  stock: 10,
  active: true,
  ...over,
});

describe('CartService', () => {
  const tx = {
    $queryRaw: jest.fn(),
    product: { findFirst: jest.fn() },
    cartItem: { findUnique: jest.fn(), count: jest.fn(), upsert: jest.fn() },
  };
  const prisma = {
    cart: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      upsert: jest.fn(),
    },
    cartItem: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new CartService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    prisma.cart.upsert.mockResolvedValue({ id: 'c1' });
    prisma.cart.findUnique.mockResolvedValue(null);
    tx.product.findFirst.mockResolvedValue(product());
    tx.cartItem.findUnique.mockResolvedValue(null);
    tx.cartItem.count.mockResolvedValue(0);
  });

  describe('view', () => {
    it('is an empty cart for a user who never added anything', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      await expect(service.view('u1', 's1')).resolves.toEqual({
        items: [],
        itemCount: 0,
        totalCents: 0,
      });
    });

    it('shows current prices, line totals and a total in cents', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        items: [
          { quantity: 2, product: product() },
          {
            quantity: 3,
            product: product({ id: 'p2', sku: 'B', priceCents: 500 }),
          },
        ],
      });
      const cart = await service.view('u1', 's1');
      expect(cart.items.map((i) => i.lineTotalCents)).toEqual([6980, 1500]);
      expect(cart.totalCents).toBe(8480);
      expect(cart.itemCount).toBe(5);
    });

    it('flags a removed product and one without enough stock, and leaves them out of the total', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        items: [
          { quantity: 1, product: product() },
          { quantity: 1, product: product({ id: 'p2', active: false }) },
          { quantity: 5, product: product({ id: 'p3', stock: 2 }) },
        ],
      });
      const cart = await service.view('u1', 's1');
      expect(cart.items.map((i) => i.available)).toEqual([true, false, false]);
      expect(cart.totalCents).toBe(3490);
      expect(cart.itemCount).toBe(1);
    });
  });

  describe('changing the cart', () => {
    it('reads the cart another request just created instead of failing on the unique key', async () => {
      prisma.cart.upsert.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('x', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      prisma.cart.findUniqueOrThrow = jest
        .fn()
        .mockResolvedValue({ id: 'c-winner' });
      await service.add('u1', 's1', 'p1', 1);
      expect(prisma.cart.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { userId_storeId: { userId: 'u1', storeId: 's1' } },
      });
      expect(tx.cartItem.upsert.mock.calls[0][0].create.cartId).toBe(
        'c-winner',
      );
    });

    it('lets any other database error through', async () => {
      prisma.cart.upsert.mockRejectedValueOnce(new Error('connection lost'));
      await expect(service.add('u1', 's1', 'p1', 1)).rejects.toThrow(
        'connection lost',
      );
    });

    it('locks the cart row while it checks and writes', async () => {
      await service.add('u1', 's1', 'p1', 2);
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('adds to what is already there', async () => {
      tx.cartItem.findUnique.mockResolvedValue({ quantity: 3 });
      await service.add('u1', 's1', 'p1', 2);
      expect(tx.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { cartId: 'c1', productId: 'p1', quantity: 5 },
          update: { quantity: 5 },
        }),
      );
    });

    it('refuses more than the stock with a 409 that carries a code', async () => {
      tx.product.findFirst.mockResolvedValue(product({ stock: 2 }));
      tx.cartItem.findUnique.mockResolvedValue({ quantity: 2 });
      const error = (await service
        .add('u1', 's1', 'p1', 1)
        .catch((e: unknown) => e)) as ConflictException;
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({
        statusCode: 409,
        code: 'NOT_ENOUGH_STOCK',
      });
      expect(tx.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('refuses a removed product, the unit limit and a full cart', async () => {
      tx.product.findFirst.mockResolvedValue(product({ active: false }));
      await expect(service.add('u1', 's1', 'p1', 1)).rejects.toBeInstanceOf(
        ConflictException,
      );
      tx.product.findFirst.mockResolvedValue(product({ stock: 99 }));
      await expect(service.add('u1', 's1', 'p1', 11)).rejects.toBeInstanceOf(
        ConflictException,
      );
      tx.cartItem.count.mockResolvedValue(20);
      await expect(service.add('u1', 's1', 'p1', 1)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('answers not found when the product does not exist', async () => {
      tx.product.findFirst.mockResolvedValue(null);
      await expect(service.add('u1', 's1', 'nope', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(tx.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('sets the quantity of a line, keeping the same rules', async () => {
      tx.cartItem.findUnique.mockResolvedValue({ quantity: 1 });
      await service.setQuantity('u1', 's1', 'p1', 4);
      expect(tx.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { quantity: 4 } }),
      );
      await expect(
        service.setQuantity('u1', 's1', 'p1', 11),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('answers not found when setting a line that is not in the cart', async () => {
      await expect(
        service.setQuantity('u1', 's1', 'p1', 4),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.cartItem.upsert).not.toHaveBeenCalled();
    });

    it("looks the product up inside the store of the cart, so another store's product is not found", async () => {
      tx.product.findFirst.mockResolvedValue(null);
      await expect(
        service.add('u1', 's1', 'p-other', 1),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p-other', storeId: 's1' },
      });
      expect(tx.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('keeps one cart per user and store', async () => {
      await service.add('u1', 's2', 'p1', 1);
      expect(prisma.cart.upsert).toHaveBeenCalledWith({
        where: { userId_storeId: { userId: 'u1', storeId: 's2' } },
        update: {},
        create: { userId: 'u1', storeId: 's2' },
      });
    });

    it('only ever touches the cart of the user it was given', async () => {
      await service.remove('u1', 's1', 'p1');
      await service.clear('u1', 's1');
      expect(
        prisma.cart.upsert.mock.calls.every(
          (c) => c[0].where.userId_storeId.userId === 'u1',
        ),
      ).toBe(true);
      expect(prisma.cartItem.deleteMany).toHaveBeenNthCalledWith(1, {
        where: { cartId: 'c1', productId: 'p1' },
      });
      expect(prisma.cartItem.deleteMany).toHaveBeenNthCalledWith(2, {
        where: { cartId: 'c1' },
      });
    });
  });
});
