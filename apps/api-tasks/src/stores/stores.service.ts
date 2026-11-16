import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateStoreDto } from './dto/update-store.dto';
import { checkSlug, slugFromName, SLUG_MESSAGES } from './store-slug';

export interface StoreLook {
  slug: string;
  name: string;
  description: string;
  tagline: string;
  primaryColor: string;
  logoImageId: string | null;
  coverImageId: string | null;
  contactEmail: string;
  contactPhone: string;
}

/** What the API shows of a store: its name and look, never the owner. */
export function presentStore(store: StoreLook): StoreLook {
  return {
    slug: store.slug,
    name: store.name,
    description: store.description,
    tagline: store.tagline,
    primaryColor: store.primaryColor,
    logoImageId: store.logoImageId,
    coverImageId: store.coverImageId,
    contactEmail: store.contactEmail,
    contactPhone: store.contactPhone,
  };
}

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

  /** The store of a seller, or null when the seller has not named one yet. */
  findOfSeller(userId: string) {
    return this.prisma.store.findUnique({ where: { ownerId: userId } });
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
      select: {
        slug: true,
        name: true,
        description: true,
        tagline: true,
        primaryColor: true,
        logoImageId: true,
        coverImageId: true,
      },
      orderBy: [{ name: 'asc' }, { slug: 'asc' }],
      take: 100,
    });
  }

  /** What anyone may see of the store at a link. */
  async publicBySlug(slug: string) {
    return presentStore(await this.bySlug(slug));
  }

  /**
   * The seller names their store, which gives it its link. A seller has one store, so a second call is refused.
   * The link is suggested from the name when none is sent.
   */
  async createOwn(userId: string, data: { name: string; slug?: string }) {
    const existing = await this.prisma.store.findUnique({
      where: { ownerId: userId },
    });
    if (existing) {
      throw new ConflictException('You already have a store');
    }
    const name = data.name.trim();
    if (!name) {
      throw new BadRequestException('A store needs a name');
    }
    const slug = data.slug?.trim() || slugFromName(name);
    const problem = checkSlug(slug);
    if (problem) {
      throw new BadRequestException(SLUG_MESSAGES[problem]);
    }
    try {
      return presentStore(
        await this.prisma.store.create({
          data: { name, slug, ownerId: userId },
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This store link is already taken');
      }
      throw error;
    }
  }

  /** What a seller sees of their own store. */
  async mineOf(userId: string) {
    return presentStore(await this.ofSeller(userId));
  }

  /** The seller edits the name and the description. The link never changes, so shared links keep working. */
  async updateOwn(userId: string, data: UpdateStoreDto) {
    const store = await this.ofSeller(userId);
    const pictures = [data.logoImageId, data.coverImageId].filter(
      (id): id is string => typeof id === 'string',
    );
    if (pictures.length > 0) {
      const owned = await this.prisma.image.count({
        where: { storeId: store.id, id: { in: pictures } },
      });
      if (owned !== new Set(pictures).size) {
        throw new BadRequestException(
          'A picture does not belong to this store',
        );
      }
    }
    const text = (value: string | undefined) => value?.trim();
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        name: text(data.name),
        description: text(data.description),
        tagline: text(data.tagline),
        primaryColor: data.primaryColor?.toLowerCase(),
        contactEmail: text(data.contactEmail),
        contactPhone: text(data.contactPhone),
        // `undefined` leaves a picture alone; `null` takes it off.
        logoImageId: data.logoImageId,
        coverImageId: data.coverImageId,
      },
    });
    return presentStore(updated);
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
