import { Injectable, NotFoundException } from '@nestjs/common';
import { hasBilling } from '../billing/billing-rules';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PLAN, PlanInfo } from './plans';
import { PlansService } from './plans.service';

const OWNER = { select: { id: true, email: true, name: true } } as const;

/** Adds whole calendar months to a date. */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * What the Orbit owner sees and does about the stores (ADR-009). Every change is written to `AdminAction`
 * in the same transaction, so the record cannot be missing. Nothing here reads a seller's payment keys.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
  ) {}

  private planOf(plans: Record<string, PlanInfo>, planId: string) {
    return plans[planId] ?? plans[DEFAULT_PLAN];
  }

  private present(
    plans: Record<string, PlanInfo>,
    store: {
      slug: string;
      name: string;
      published: boolean;
      planId: string;
      paidUntil: Date | null;
      subscriptionStatus: string | null;
      trialEndsAt: Date | null;
      suspendedAt: Date | null;
      suspendedReason: string | null;
      paymentProvider: string | null;
      paymentCredentials: string | null;
      createdAt: Date;
      owner: { id: string; email: string; name: string | null };
      _count?: { orders: number };
    },
  ) {
    const paid = hasBilling(store);
    return {
      slug: store.slug,
      name: store.name,
      published: store.published,
      createdAt: store.createdAt,
      owner: store.owner,
      plan: this.planOf(plans, store.planId),
      paidUntil: store.paidUntil,
      subscriptionStatus: store.subscriptionStatus,
      trialEndsAt: store.trialEndsAt,
      // `paid` is a fact about the money; `suspended` is a decision. The two are separate on purpose.
      paid,
      suspended: store.suspendedAt !== null,
      suspendedAt: store.suspendedAt,
      suspendedReason: store.suspendedReason,
      paymentConnected: Boolean(
        store.paymentProvider && store.paymentCredentials,
      ),
      orders: store._count?.orders ?? 0,
    };
  }

  async overview() {
    const stores = await this.prisma.store.findMany({
      select: {
        planId: true,
        paidUntil: true,
        subscriptionStatus: true,
        suspendedAt: true,
      },
    });
    const plans = await this.plans.all();
    const paying = stores.filter((s) => hasBilling(s) && !s.suspendedAt);
    return {
      stores: stores.length,
      paying: paying.length,
      suspended: stores.filter((s) => s.suspendedAt).length,
      // The monthly revenue the paid stores add up to, in the cents of each plan's currency (BRL today).
      monthlyCents: paying.reduce(
        (sum, s) => sum + this.planOf(plans, s.planId).priceCents,
        0,
      ),
      currency: this.planOf(plans, DEFAULT_PLAN).currency,
    };
  }

  async listStores(query?: string) {
    const q = query?.trim();
    const stores = await this.prisma.store.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
              { owner: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: { owner: OWNER, _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const plans = await this.plans.all();
    return stores.map((store) => this.present(plans, store));
  }

  private async load(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: { owner: OWNER, _count: { select: { orders: true } } },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async storeDetail(slug: string) {
    const store = await this.load(slug);
    const history = await this.prisma.adminAction.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, action: true, detail: true, createdAt: true },
    });
    return { ...this.present(await this.plans.all(), store), history };
  }

  /** The seller paid: the plan is paid for `months` more, counted from today or from the end of what was paid. */
  async recordPayment(
    adminId: string,
    slug: string,
    months = 1,
    note?: string,
  ) {
    const store = await this.load(slug);
    const now = new Date();
    const from =
      store.paidUntil && store.paidUntil > now ? store.paidUntil : now;
    const paidUntil = addMonths(from, months);
    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { id: store.id },
        data: { paidUntil },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          storeId: store.id,
          action: 'RECORD_PAYMENT',
          detail: {
            months,
            note: note?.trim() || null,
            amountCents:
              this.planOf(await this.plans.all(), store.planId).priceCents *
              months,
            paidUntil: paidUntil.toISOString(),
          },
        },
      }),
    ]);
    return this.storeDetail(slug);
  }

  async suspend(adminId: string, slug: string, reason: string) {
    const store = await this.load(slug);
    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { id: store.id },
        data: { suspendedAt: new Date(), suspendedReason: reason.trim() },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          storeId: store.id,
          action: 'SUSPEND',
          detail: { reason: reason.trim() },
        },
      }),
    ]);
    return this.storeDetail(slug);
  }

  async reactivate(adminId: string, slug: string) {
    const store = await this.load(slug);
    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { id: store.id },
        data: { suspendedAt: null, suspendedReason: null },
      }),
      this.prisma.adminAction.create({
        data: { adminId, storeId: store.id, action: 'REACTIVATE', detail: {} },
      }),
    ]);
    return this.storeDetail(slug);
  }

  /** The plans with their current price, for the owner's page. */
  async listPlans() {
    return Object.values(await this.plans.all());
  }

  /** Sets a plan's price. New subscriptions use it; subscriptions already running at Mercado Pago keep theirs. */
  setPlanPrice(adminId: string, id: string, priceCents: number) {
    return this.plans.setPrice(adminId, id, priceCents);
  }
}
