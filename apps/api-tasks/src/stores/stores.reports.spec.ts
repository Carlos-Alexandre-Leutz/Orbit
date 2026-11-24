import { StoresService } from './stores.service';

const order = (paidAt: string, totalCents: number, items: object[]) => ({
  paidAt: new Date(paidAt),
  totalCents,
  items,
});
const item = (
  productId: string,
  name: string,
  quantity: number,
  priceCents: number,
) => ({ productId, sku: name.toUpperCase(), name, quantity, priceCents });

function setup() {
  const prisma = {
    store: { findUnique: jest.fn().mockResolvedValue({ id: 's1' }) },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    product: { findMany: jest.fn().mockResolvedValue([]) },
    orderItem: { groupBy: jest.fn().mockResolvedValue([]) },
  };
  return {
    prisma,
    service: new StoresService(
      prisma as never,
      { removeUnused: jest.fn() } as never,
    ),
  };
}

describe('StoresService reports', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-24T15:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  describe('salesOf', () => {
    it('asks only for paid orders of this store since the first day of the period', async () => {
      const { prisma, service } = setup();
      await service.salesOf('u1', 7);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            storeId: 's1',
            status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
            paidAt: { gte: new Date('2026-11-18T00:00:00Z') },
          },
        }),
      );
    });

    it('adds up revenue, orders, units and the average, and lists every day even with no sale', async () => {
      const { prisma, service } = setup();
      prisma.order.findMany.mockResolvedValue([
        order('2026-11-24T10:00:00Z', 3000, [
          item('p1', 'shoe', 1, 1000),
          item('p2', 'sock', 2, 1000),
        ]),
        order('2026-11-24T12:00:00Z', 1000, [item('p1', 'shoe', 1, 1000)]),
        order('2026-11-22T09:00:00Z', 2000, [item('p3', 'hat', 1, 2000)]),
      ]);
      const sales = await service.salesOf('u1', 7);
      expect(sales).toMatchObject({
        days: 7,
        revenueCents: 6000,
        orders: 3,
        units: 5,
        averageOrderCents: 2000,
      });
      expect(sales.byDay).toHaveLength(7);
      expect(sales.byDay[0]).toEqual({
        date: '2026-11-18',
        revenueCents: 0,
        orders: 0,
      });
      expect(sales.byDay.at(-1)).toEqual({
        date: '2026-11-24',
        revenueCents: 4000,
        orders: 2,
      });
      expect(sales.byDay.find((d) => d.date === '2026-11-22')).toMatchObject({
        revenueCents: 2000,
        orders: 1,
      });
    });

    it('ranks the top products by what they earned, at most five', async () => {
      const { prisma, service } = setup();
      prisma.order.findMany.mockResolvedValue([
        order(
          '2026-11-24T10:00:00Z',
          0,
          ['a', 'b', 'c', 'd', 'e', 'f'].map((n, i) =>
            item(n, n, 1, (i + 1) * 100),
          ),
        ),
        order('2026-11-24T11:00:00Z', 0, [item('a', 'a', 1, 50)]),
      ]);
      const { topProducts } = await service.salesOf('u1', 30);
      expect(topProducts).toHaveLength(5);
      expect(topProducts[0]).toMatchObject({
        productId: 'f',
        revenueCents: 600,
      });
      expect(topProducts.find((p) => p.productId === 'a')).toBeUndefined();
    });

    it('has zeros and no division by zero for a period with no sale', async () => {
      const { service } = setup();
      expect(await service.salesOf('u1', 30)).toMatchObject({
        revenueCents: 0,
        orders: 0,
        averageOrderCents: 0,
        topProducts: [],
      });
    });

    it('keeps the period between 1 and 90 days and defaults to 30', async () => {
      const { service } = setup();
      expect((await service.salesOf('u1', 500)).days).toBe(90);
      expect((await service.salesOf('u1', -4)).days).toBe(1);
      expect((await service.salesOf('u1', Number.NaN)).days).toBe(30);
    });
  });

  describe('stockOf', () => {
    it('marks out of stock and low stock, and estimates how long the stock lasts from the pace of 30 days', async () => {
      const { prisma, service } = setup();
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', sku: 'A', name: 'Out', stock: 0, priceCents: 100 },
        { id: 'p2', sku: 'B', name: 'Low', stock: 3, priceCents: 100 },
        { id: 'p3', sku: 'C', name: 'Fine', stock: 60, priceCents: 100 },
      ]);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p2', _sum: { quantity: 30 } },
        { productId: 'p3', _sum: { quantity: 15 } },
      ]);
      const stock = await service.stockOf('u1');
      expect(stock.lowStockLimit).toBe(5);
      expect(
        stock.items.map((i) => [i.name, i.status, i.sold30, i.daysLeft]),
      ).toEqual([
        ['Out', 'OUT', 0, null],
        ['Low', 'LOW', 30, 3],
        ['Fine', 'OK', 15, 120],
      ]);
    });

    it('looks only at the active products of this store and sorts from the least stock', async () => {
      const { prisma, service } = setup();
      await service.stockOf('u1');
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 's1', active: true },
          orderBy: [{ stock: 'asc' }, { name: 'asc' }],
        }),
      );
    });
  });
});
