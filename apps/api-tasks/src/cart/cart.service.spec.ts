import { NotFoundException } from '@nestjs/common';
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
  const prisma = {
    cart: { findUnique: jest.fn(), upsert: jest.fn() },
    cartItem: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: { findUnique: jest.fn() },
  };
  const service = new CartService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.cart.upsert.mockResolvedValue({ id: 'c1' });
    prisma.product.findUnique.mockResolvedValue(product());
  });

  describe('view', () => {
    it('is an empty cart for a user who never added anything', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      await expect(service.view('u1')).resolves.toEqual({
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
      const cart = await service.view('u1');
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
      const cart = await service.view('u1');
      expect(cart.items.map((i) => i.available)).toEqual([true, false, false]);
      expect(cart.totalCents).toBe(3490);
      expect(cart.itemCount).toBe(1);
    });
  });

  describe('changing the cart', () => {
    it('adds by incrementing, in one atomic statement', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      await service.add('u1', 'p1', 2);
      expect(prisma.cartItem.upsert).toHaveBeenCalledWith({
        where: { cartId_productId: { cartId: 'c1', productId: 'p1' } },
        create: { cartId: 'c1', productId: 'p1', quantity: 2 },
        update: { quantity: { increment: 2 } },
      });
    });

    it('answers not found when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.add('u1', 'nope', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('sets the quantity of a line that is in the cart', async () => {
      prisma.cartItem.updateMany.mockResolvedValue({ count: 1 });
      prisma.cart.findUnique.mockResolvedValue(null);
      await service.setQuantity('u1', 'p1', 4);
      expect(prisma.cartItem.updateMany).toHaveBeenCalledWith({
        where: { cartId: 'c1', productId: 'p1' },
        data: { quantity: 4 },
      });
    });

    it('answers not found when setting a line that is not in the cart', async () => {
      prisma.cartItem.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.setQuantity('u1', 'p1', 4)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('only ever touches the cart of the user it was given', async () => {
      await service.remove('u1', 'p1');
      await service.clear('u1');
      expect(
        prisma.cart.upsert.mock.calls.every((c) => c[0].where.userId === 'u1'),
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
