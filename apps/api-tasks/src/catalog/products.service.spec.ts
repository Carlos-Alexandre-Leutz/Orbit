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

  describe('search and filters', () => {
    const whereOf = async (query: object) => {
      await service.list(query);
      return prisma.product.findMany.mock.calls.at(-1)[0];
    };

    it('requires every word to match somewhere in name, description or sku', async () => {
      const { where } = await whereOf({ q: 'cast  skillet' });
      expect(where.AND).toHaveLength(2);
      expect(where.AND[0].OR).toHaveLength(3);
      expect(JSON.stringify(where.AND[0])).toContain('"contains":"cast"');
      expect(JSON.stringify(where.AND[1])).toContain('"insensitive"');
    });

    it('escapes the wildcards of a LIKE pattern so they are searched as text', async () => {
      const { where } = await whereOf({ q: '100%_a\\b' });
      expect(JSON.stringify(where.AND[0])).toContain(
        '"contains":"100\\\\%\\\\_a\\\\\\\\b"',
      );
    });

    it('ignores a blank search and limits the number of words', async () => {
      expect((await whereOf({ q: '   ' })).where.AND).toBeUndefined();
      const many = Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ');
      expect((await whereOf({ q: many })).where.AND).toHaveLength(8);
    });

    it('filters by category slug and by stock', async () => {
      expect((await whereOf({ category: 'kitchen' })).where.category).toEqual({
        slug: 'kitchen',
      });
      expect((await whereOf({ inStock: true })).where.stock).toEqual({ gt: 0 });
      expect((await whereOf({ inStock: false })).where.stock).toBe(0);
      expect((await whereOf({})).where.stock).toBeUndefined();
    });

    it('never shows hidden products, whatever the filters', async () => {
      expect(
        (await whereOf({ q: 'a', category: 'b', inStock: true })).where.active,
      ).toBe(true);
    });

    it.each([
      ['name', { name: 'asc' }],
      ['price_asc', { priceCents: 'asc' }],
      ['price_desc', { priceCents: 'desc' }],
      ['newest', { createdAt: 'desc' }],
    ])('sorts by %s with a stable tie-break', async (sort, first) => {
      const { orderBy } = await whereOf({ sort });
      expect(orderBy[0]).toEqual(first);
      expect(orderBy[orderBy.length - 1]).toEqual({ id: 'asc' });
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
