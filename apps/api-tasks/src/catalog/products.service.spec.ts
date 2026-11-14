import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('x', {
    code,
    clientVersion: 'test',
  });

describe('ProductsService', () => {
  const prisma = {
    product: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: { findUnique: jest.fn() },
  };
  const service = new ProductsService(prisma as never);
  const dto = {
    sku: 'KIT-1',
    name: 'Spoon',
    priceCents: 100,
    stock: 1,
    categorySlug: 'kitchen',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.category.findUnique.mockResolvedValue({ id: 'c1', slug: 'kitchen' });
  });

  it('lists only active products, with the paging it was given', async () => {
    const page = await service.list({ page: 3, pageSize: 10 });
    const args = prisma.product.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ active: true });
    expect(args).toMatchObject({ skip: 20, take: 10 });
    expect(page).toMatchObject({ page: 3, pageSize: 10, total: 0 });
  });

  it('defaults to page 1 of 20', async () => {
    await service.list({});
    expect(prisma.product.findMany.mock.calls[0][0]).toMatchObject({
      skip: 0,
      take: 20,
    });
  });

  it('answers not found for a hidden or unknown product', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.get('x')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.findFirst.mock.calls[0][0].where.active).toBe(true);
  });

  it('refuses an unknown category with 400, before touching products', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('answers conflict for a duplicate sku', async () => {
    prisma.product.create.mockRejectedValue(known('P2002'));
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('answers not found when updating a product that does not exist', async () => {
    prisma.product.update.mockRejectedValue(known('P2025'));
    await expect(service.update('x', { stock: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes by hiding: the row is updated, never deleted', async () => {
    prisma.product.update.mockResolvedValue({});
    await service.remove('p1');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { active: false },
    });
  });

  it('lets an unexpected error through', async () => {
    prisma.product.create.mockRejectedValue(new Error('boom'));
    await expect(service.create(dto)).rejects.toThrow('boom');
  });
});
