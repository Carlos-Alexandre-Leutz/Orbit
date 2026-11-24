import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StoresService } from '../stores/stores.service';

/**
 * Customers are global accounts, linked to the stores they joined or bought from. A seller reads only the
 * customers linked to their own store, and from them only what their own store's orders show.
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The stores a customer is linked to, with the consent given to each. */
  async storesOf(userId: string) {
    const links = await this.prisma.storeCustomer.findMany({
      where: { userId },
      include: { store: { select: { slug: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return links.map((link) => ({
      store: link.store,
      marketingConsent: link.marketingConsent,
      joinedAt: link.createdAt,
    }));
  }

  /** Marketing consent is per store: changing it for one store never touches another. */
  async setConsent(userId: string, slug: string, marketingConsent: boolean) {
    const store = await this.stores.bySlug(slug);
    await this.prisma.storeCustomer.upsert({
      where: { storeId_userId: { storeId: store.id, userId } },
      update: {
        marketingConsent,
        consentAt: marketingConsent ? new Date() : null,
      },
      create: {
        storeId: store.id,
        userId,
        marketingConsent,
        consentAt: marketingConsent ? new Date() : null,
      },
    });
    return { store: { slug: store.slug, name: store.name }, marketingConsent };
  }

  /**
   * The customers of the store of this seller. The store comes from the session, never from the request.
   * Only the name, the e-mail and the figures of orders placed in this store are shown.
   */
  async ofSellerStore(sellerId: string) {
    const store = await this.stores.ofSeller(sellerId);
    const links = await this.prisma.storeCustomer.findMany({
      where: { storeId: store.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const totals = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        storeId: store.id,
        userId: { in: links.map((link) => link.userId) },
        status: { not: 'CANCELLED' },
      },
      _count: { _all: true },
      _sum: { totalCents: true },
    });
    const byUser = new Map(totals.map((row) => [row.userId, row]));
    return links.map((link) => ({
      name: link.user.name,
      email: link.user.email,
      joinedAt: link.createdAt,
      marketingConsent: link.marketingConsent,
      orders: byUser.get(link.userId)?._count._all ?? 0,
      spentCents: byUser.get(link.userId)?._sum.totalCents ?? 0,
    }));
  }

  /**
   * Deletes a customer account. The orders stay, because the stores must keep their sales, but they no longer
   * point at a person: the name goes, the e-mail becomes a placeholder, the password is unusable, and the
   * carts and the links to the stores are removed. The account can no longer sign in.
   */
  async deleteAccount(userId: string) {
    if (await this.stores.findOfSeller(userId)) {
      throw new ConflictException(
        'An account that owns a store cannot be deleted yet',
      );
    }
    await this.prisma.$transaction([
      this.prisma.cart.deleteMany({ where: { userId } }),
      this.prisma.storeCustomer.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@orbit.invalid`,
          name: null,
          password: randomBytes(32).toString('hex'),
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      }),
    ]);
  }
}
