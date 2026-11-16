import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const prisma = {
    storeCustomer: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    order: { groupBy: jest.fn() },
    cart: { deleteMany: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn(),
  };
  const stores = {
    ofSeller: jest.fn(),
    bySlug: jest.fn(),
    findOfSeller: jest.fn(),
  };
  const service = new CustomersService(prisma as never, stores as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.storeCustomer.findMany.mockResolvedValue([]);
    prisma.order.groupBy.mockResolvedValue([]);
  });

  it('lists the customers of the store of the seller, never one named by the request', async () => {
    stores.ofSeller.mockResolvedValue({ id: 'store-a' });
    await service.ofSellerStore('seller-a');
    expect(stores.ofSeller).toHaveBeenCalledWith('seller-a');
    expect(prisma.storeCustomer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: 'store-a' } }),
    );
    expect(prisma.order.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: 'store-a' }),
      }),
    );
  });

  it('shows a customer only the figures of this store', async () => {
    stores.ofSeller.mockResolvedValue({ id: 'store-a' });
    prisma.storeCustomer.findMany.mockResolvedValue([
      {
        userId: 'u1',
        createdAt: new Date(0),
        marketingConsent: true,
        user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
      },
    ]);
    prisma.order.groupBy.mockResolvedValue([
      { userId: 'u1', _count: { _all: 2 }, _sum: { totalCents: 5000 } },
    ]);
    const [row] = await service.ofSellerStore('seller-a');
    expect(row).toMatchObject({ orders: 2, spentCents: 5000 });
    expect(Object.keys(row).sort()).toEqual([
      'email',
      'joinedAt',
      'marketingConsent',
      'name',
      'orders',
      'spentCents',
    ]);
  });

  it('gives consent to one store only', async () => {
    stores.bySlug.mockResolvedValue({ id: 's2', slug: 'two', name: 'Two' });
    await service.setConsent('u1', 'two', true);
    expect(prisma.storeCustomer.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.storeCustomer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId_userId: { storeId: 's2', userId: 'u1' } },
      }),
    );
  });

  it('anonymises the account and removes carts and store links', async () => {
    prisma.$transaction.mockResolvedValue([]);
    await service.deleteAccount('u1');
    expect(prisma.cart.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.storeCustomer.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          email: 'deleted-u1@orbit.invalid',
          name: null,
        }),
      }),
    );
  });

  it('refuses to delete an account that owns a store', async () => {
    stores.findOfSeller.mockResolvedValue({ id: 'store-a' });
    await expect(service.deleteAccount('u1')).rejects.toThrow(
      'cannot be deleted',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
