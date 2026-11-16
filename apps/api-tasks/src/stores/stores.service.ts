import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** A product with this many units or fewer is shown as running low. */
export const LOW_STOCK = 5;

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The store of the logged-in seller. Seller endpoints take the store from here, never from the request,
   * so a seller cannot name another store.
   */
  async ofSeller(userId: string) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: userId },
    });
    if (!store) {
      throw new ForbiddenException('This account has no store');
    }
    return store;
  }

  /** The store at a link; a link that belongs to no store is a plain 404. */
  async bySlug(slug: string) {
    const store = await this.prisma.store.findUnique({ where: { slug } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  /** Every store, for the page where a buyer picks one. Only what is public: no owner. */
  list() {
    return this.prisma.store.findMany({
      select: { slug: true, name: true, description: true },
      orderBy: [{ name: 'asc' }, { slug: 'asc' }],
      take: 100,
    });
  }

  /** What anyone may see of the store at a link. */
  async publicBySlug(slug: string) {
    const store = await this.bySlug(slug);
    return {
      slug: store.slug,
      name: store.name,
      description: store.description,
    };
  }

  /** What a seller sees of their own store. */
  async mineOf(userId: string) {
    const store = await this.ofSeller(userId);
    return {
      slug: store.slug,
      name: store.name,
      description: store.description,
    };
  }

  /** The seller edits the name and the description. The link never changes, so shared links keep working. */
  async updateOwn(
    userId: string,
    data: { name?: string; description?: string },
  ) {
    const store = await this.ofSeller(userId);
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && {
          description: data.description.trim(),
        }),
      },
    });
    return {
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
    };
  }

  /** The numbers for the start page of the panel, all about the seller's own store. */
  async summaryOf(userId: string) {
    const store = await this.ofSeller(userId);
    const [products, lowStock, byStatus, revenue, customers] =
      await Promise.all([
        this.prisma.product.count({
          where: { storeId: store.id, active: true },
        }),
        this.prisma.product.count({
          where: { storeId: store.id, active: true, stock: { lte: LOW_STOCK } },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where: { storeId: store.id },
          _count: { _all: true },
        }),
        this.prisma.order.aggregate({
          where: {
            storeId: store.id,
            status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          },
          _sum: { totalCents: true },
        }),
        this.prisma.storeCustomer.count({ where: { storeId: store.id } }),
      ]);
    return {
      products,
      lowStock,
      lowStockLimit: LOW_STOCK,
      customers,
      revenueCents: revenue._sum.totalCents ?? 0,
      orders: Object.fromEntries(
        byStatus.map((row) => [row.status, row._count._all]),
      ),
    };
  }
}
