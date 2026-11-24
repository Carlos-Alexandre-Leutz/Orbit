import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ImageStorage } from '../images/image-storage';
import { hasBilling } from '../billing/billing-rules';
import { PrismaService } from '../prisma/prisma.service';
import {
  canStoreCredentials,
  encryptCredentials,
} from '../payments/credential-cipher';
import type { ConnectPaymentDto } from './dto/connect-payment.dto';
import type { UpdateStoreDto } from './dto/update-store.dto';
import { checkSlug, slugFromName, SLUG_MESSAGES } from './store-slug';
import {
  parseDeliveryByState,
  PAYMENT_KEY_FORMATS,
  TEMPLATE_COLORS,
  TEMPLATES,
  type DeliveryByState,
  type Template,
} from './store-config';

export interface StoreLook {
  slug: string;
  name: string;
  description: string;
  tagline: string;
  primaryColor: string;
  logoImageId: string | null;
  bannerImageIds: string[];
  contactEmail: string;
  contactPhone: string;
  published: boolean;
  template: string;
  shippingFlatCents: number;
  freeShippingOverCents: number | null;
  pickupEnabled: boolean;
  handlingDays: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  deliveryByState: unknown;
  paymentMethods: string[];
  highlights: unknown;
  paymentProvider: string | null;
  paymentPublicKey: string | null;
  /** On the database row; `suspended` is what the API shows instead. */
  suspendedAt?: Date | null;
  suspended?: boolean;
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
    bannerImageIds: store.bannerImageIds,
    contactEmail: store.contactEmail,
    contactPhone: store.contactPhone,
    published: store.published,
    template: store.template,
    shippingFlatCents: store.shippingFlatCents,
    freeShippingOverCents: store.freeShippingOverCents,
    pickupEnabled: store.pickupEnabled,
    handlingDays: store.handlingDays,
    deliveryDaysMin: store.deliveryDaysMin,
    deliveryDaysMax: store.deliveryDaysMax,
    deliveryByState: store.deliveryByState,
    paymentMethods: store.paymentMethods,
    highlights: Array.isArray(store.highlights) ? store.highlights : [],
    // Only the public key: the secrets stay encrypted in the database and are never read back.
    paymentProvider: store.paymentProvider,
    paymentPublicKey: store.paymentPublicKey,
    // Suspended by an Orbit admin: the storefront is closed (the reason is only for the admin).
    suspended: Boolean(store.suspendedAt),
  };
}

/** The chosen highlights without repeats, each with a trimmed text (or none). */
function uniqueHighlights(items: { id: string; text?: string }[]) {
  const seen = new Set<string>();
  return items
    .filter((item) => !seen.has(item.id) && seen.add(item.id))
    .map((item) => {
      const text = item.text?.trim();
      return text ? { id: item.id, text } : { id: item.id };
    });
}

/** A product with this many units or fewer is shown as running low. */
export const LOW_STOCK = 5;

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStorage,
  ) {}

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

  /** The categories that have at least one product on sale in this store, for its menu and filters. */
  async categoriesOf(slug: string) {
    const store = await this.bySlug(slug);
    return this.prisma.category.findMany({
      where: {
        storeId: store.id,
        products: { some: { active: true } },
      },
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
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
  async createOwn(
    userId: string,
    data: {
      name: string;
      slug?: string;
      template?: string;
      sellingModes?: string[];
    },
  ) {
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
    const template: Template = TEMPLATES.includes(data.template as Template)
      ? (data.template as Template)
      : 'classic';
    try {
      return presentStore(
        await this.prisma.store.create({
          data: {
            name,
            slug,
            ownerId: userId,
            // A new store is a draft: the owner chooses when to publish it.
            published: false,
            template,
            primaryColor: TEMPLATE_COLORS[template],
            sellingModes: [...new Set(data.sellingModes ?? [])],
          },
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
    const store = await this.ofSeller(userId);
    return {
      ...presentStore(store),
      sellingModes: store.sellingModes,
      paymentConnected: Boolean(
        store.paymentProvider && store.paymentCredentials,
      ),
    };
  }

  /** The seller connects their own payment provider (ADR-008). The secrets are encrypted before they are saved. */
  async connectPayments(userId: string, data: ConnectPaymentDto) {
    const store = await this.ofSeller(userId);
    const formats = PAYMENT_KEY_FORMATS[data.provider];
    const secretKey = data.secretKey.trim();
    const publicKey = data.publicKey.trim();
    const webhookSecret = data.webhookSecret.trim();
    if (!formats.secret.test(secretKey)) {
      throw new BadRequestException('The secret key does not look right');
    }
    if (!formats.publicKey.test(publicKey)) {
      throw new BadRequestException('The public key does not look right');
    }
    if (!formats.webhook.test(webhookSecret)) {
      throw new BadRequestException('The webhook secret does not look right');
    }
    const mode = (key: string) => (key.includes('_test_') ? 'test' : 'live');
    if (data.provider === 'stripe' && mode(secretKey) !== mode(publicKey)) {
      throw new BadRequestException(
        'The secret key and the public key are from different Stripe modes (test and live)',
      );
    }
    if (!canStoreCredentials()) {
      throw new ServiceUnavailableException(
        'Payment credentials cannot be stored on this server yet',
      );
    }
    await this.prisma.store.update({
      where: { id: store.id },
      data: {
        paymentProvider: data.provider,
        paymentPublicKey: publicKey,
        paymentCredentials: encryptCredentials(
          JSON.stringify({ secretKey, webhookSecret }),
        ),
      },
    });
    return this.mineOf(userId);
  }

  async disconnectPayments(userId: string) {
    const store = await this.ofSeller(userId);
    await this.prisma.store.update({
      where: { id: store.id },
      data: {
        paymentProvider: null,
        paymentPublicKey: null,
        paymentCredentials: null,
      },
    });
    return this.mineOf(userId);
  }

  /** The seller edits the name and the description. The link never changes, so shared links keep working. */
  async updateOwn(userId: string, data: UpdateStoreDto) {
    const store = await this.ofSeller(userId);
    const pictures = [data.logoImageId, ...(data.bannerImageIds ?? [])].filter(
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
    // A store opens to the public only with a subscription on (its free days included) or a recorded payment.
    if (data.published === true && !hasBilling(store)) {
      throw new HttpException(
        'Start your free trial in Billing to open your store to the public',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    const shortest = data.deliveryDaysMin ?? store.deliveryDaysMin;
    const longest = data.deliveryDaysMax ?? store.deliveryDaysMax;
    if (shortest > longest) {
      throw new BadRequestException(
        'The shortest delivery time cannot be longer than the longest',
      );
    }
    let byState: DeliveryByState | undefined;
    if (data.deliveryByState !== undefined) {
      const parsed = parseDeliveryByState(data.deliveryByState);
      if ('error' in parsed) throw new BadRequestException(parsed.error);
      byState = parsed.value;
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
        bannerImageIds: data.bannerImageIds,
        template: data.template,
        published: data.published,
        shippingFlatCents: data.shippingFlatCents,
        freeShippingOverCents: data.freeShippingOverCents,
        pickupEnabled: data.pickupEnabled,
        handlingDays: data.handlingDays,
        deliveryDaysMin: data.deliveryDaysMin,
        deliveryDaysMax: data.deliveryDaysMax,
        deliveryByState: byState,
        paymentMethods: data.paymentMethods,
        highlights: data.highlights
          ? uniqueHighlights(data.highlights)
          : undefined,
      },
    });
    // A picture that was replaced or taken off is deleted unless something else still shows it.
    const replaced = [
      data.logoImageId !== undefined && data.logoImageId !== store.logoImageId
        ? store.logoImageId
        : null,
      ...store.bannerImageIds.filter(
        (id) => data.bannerImageIds && !data.bannerImageIds.includes(id),
      ),
    ].filter((id): id is string => id !== null);
    await this.images.removeUnused(store.id, replaced);
    return presentStore(updated);
  }

  /** The numbers for the start page of the panel, all about the seller's own store. */
  async summaryOf(userId: string) {
    const store = await this.ofSeller(userId);
    const [products, categories, lowStock, byStatus, revenue, customers] =
      await Promise.all([
        this.prisma.product.count({
          where: { storeId: store.id, active: true },
        }),
        this.prisma.category.count({ where: { storeId: store.id } }),
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
      categories,
      lowStock,
      lowStockLimit: LOW_STOCK,
      customers,
      revenueCents: revenue._sum.totalCents ?? 0,
      orders: Object.fromEntries(
        byStatus.map((row) => [row.status, row._count._all]),
      ),
    };
  }

  /**
   * Sales of the seller's store in the last `days` days (1 to 90): revenue, orders, units, the revenue of each
   * day (days with no sale included, so a chart has no gaps) and the five products that earned the most.
   * Only paid orders count: paid, shipped and delivered, dated by the payment.
   */
  async salesOf(userId: string, days = 30) {
    const store = await this.ofSeller(userId);
    const span = Math.min(90, Math.max(1, Math.floor(days) || 30));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const from = new Date(today.getTime() - (span - 1) * 86_400_000);
    const orders = await this.prisma.order.findMany({
      where: {
        storeId: store.id,
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        paidAt: { gte: from },
      },
      select: {
        paidAt: true,
        totalCents: true,
        items: {
          select: {
            productId: true,
            sku: true,
            name: true,
            quantity: true,
            priceCents: true,
          },
        },
      },
    });
    const byDay = new Map<string, { revenueCents: number; orders: number }>();
    for (let i = 0; i < span; i++) {
      byDay.set(
        new Date(from.getTime() + i * 86_400_000).toISOString().slice(0, 10),
        {
          revenueCents: 0,
          orders: 0,
        },
      );
    }
    const products = new Map<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        units: number;
        revenueCents: number;
      }
    >();
    let revenueCents = 0;
    let units = 0;
    for (const order of orders) {
      revenueCents += order.totalCents;
      const day = byDay.get((order.paidAt as Date).toISOString().slice(0, 10));
      if (day) {
        day.revenueCents += order.totalCents;
        day.orders += 1;
      }
      for (const item of order.items) {
        units += item.quantity;
        const line = products.get(item.productId) ?? {
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          units: 0,
          revenueCents: 0,
        };
        line.units += item.quantity;
        line.revenueCents += item.priceCents * item.quantity;
        products.set(item.productId, line);
      }
    }
    return {
      days: span,
      revenueCents,
      orders: orders.length,
      units,
      averageOrderCents: orders.length
        ? Math.round(revenueCents / orders.length)
        : 0,
      byDay: [...byDay].map(([date, value]) => ({ date, ...value })),
      topProducts: [...products.values()]
        .sort((a, b) => b.revenueCents - a.revenueCents)
        .slice(0, 5),
    };
  }

  /**
   * The products on sale from the least stock to the most, with what sold in the last 30 days and, from
   * that pace, about how many days the stock lasts (null when nothing sold, so there is no pace to go by).
   */
  async stockOf(userId: string) {
    const store = await this.ofSeller(userId);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [products, sold] = await Promise.all([
      this.prisma.product.findMany({
        where: { storeId: store.id, active: true },
        orderBy: [{ stock: 'asc' }, { name: 'asc' }],
        take: 200,
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
          priceCents: true,
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            storeId: store.id,
            status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
            paidAt: { gte: since },
          },
        },
        _sum: { quantity: true },
      }),
    ]);
    const soldBy = new Map(
      sold.map((row) => [row.productId, row._sum.quantity ?? 0]),
    );
    return {
      lowStockLimit: LOW_STOCK,
      items: products.map((p) => {
        const sold30 = soldBy.get(p.id) ?? 0;
        return {
          ...p,
          status: p.stock === 0 ? 'OUT' : p.stock <= LOW_STOCK ? 'LOW' : 'OK',
          sold30,
          daysLeft: sold30 > 0 ? Math.floor(p.stock / (sold30 / 30)) : null,
        };
      }),
    };
  }
}
