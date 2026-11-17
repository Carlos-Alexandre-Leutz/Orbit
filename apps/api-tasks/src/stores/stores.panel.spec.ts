import { StoresService } from './stores.service';

describe('StoresService (seller panel)', () => {
  const prisma = {
    store: { findUnique: jest.fn(), update: jest.fn() },
    product: { count: jest.fn() },
    category: { count: jest.fn() },
    order: { groupBy: jest.fn(), aggregate: jest.fn() },
    storeCustomer: { count: jest.fn() },
  };
  const service = new StoresService(
    prisma as never,
    { removeUnused: jest.fn() } as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.store.findUnique.mockResolvedValue({
      id: 'store-a',
      slug: 'a-shop',
      name: 'A',
      description: '',
      logoImageId: null,
      bannerImageIds: [],
      deliveryDaysMin: 3,
      deliveryDaysMax: 7,
    });
  });

  it('edits the store of the seller and never changes its link', async () => {
    prisma.store.update.mockResolvedValue({
      slug: 'a-shop',
      name: 'New name',
      description: 'Text',
    });
    await service.updateOwn('seller-a', {
      name: ' New name ',
      description: ' Text ',
    });
    expect(prisma.store.findUnique).toHaveBeenCalledWith({
      where: { ownerId: 'seller-a' },
    });
    expect(prisma.store.update).toHaveBeenCalledWith({
      where: { id: 'store-a' },
      data: { name: 'New name', description: 'Text' },
    });
  });

  it('counts only the own store in the summary', async () => {
    prisma.product.count.mockResolvedValue(2);
    prisma.category.count.mockResolvedValue(3);
    prisma.order.groupBy.mockResolvedValue([
      { status: 'PAID', _count: { _all: 1 } },
    ]);
    prisma.order.aggregate.mockResolvedValue({ _sum: { totalCents: 900 } });
    prisma.storeCustomer.count.mockResolvedValue(4);
    const summary = await service.summaryOf('seller-a');
    expect(summary).toMatchObject({
      products: 2,
      customers: 4,
      revenueCents: 900,
      orders: { PAID: 1 },
    });
    for (const call of [
      prisma.product.count.mock.calls[0],
      prisma.order.groupBy.mock.calls[0],
      prisma.order.aggregate.mock.calls[0],
      prisma.storeCustomer.count.mock.calls[0],
    ] as Array<[{ where: { storeId: string } }]>) {
      expect(call[0].where.storeId).toBe('store-a');
    }
  });
});
