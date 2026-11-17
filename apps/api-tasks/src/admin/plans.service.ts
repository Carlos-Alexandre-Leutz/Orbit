import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PLAN, FALLBACK_PLANS, PlanInfo } from './plans';

/** The plans and their prices, read from the database so an admin can edit them. */
@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every plan by id. A plan missing from the database falls back to the built-in one. */
  async all(): Promise<Record<string, PlanInfo>> {
    const rows = await this.prisma.plan.findMany();
    const plans: Record<string, PlanInfo> = { ...FALLBACK_PLANS };
    for (const row of rows) {
      plans[row.id] = {
        id: row.id,
        name: row.name,
        priceCents: row.priceCents,
        currency: row.currency,
      };
    }
    return plans;
  }

  async get(id = DEFAULT_PLAN): Promise<PlanInfo> {
    const plans = await this.all();
    return plans[id] ?? plans[DEFAULT_PLAN];
  }

  /** Sets the price and writes who did it in the same transaction. New subscriptions use it at once. */
  async setPrice(adminId: string, id: string, priceCents: number) {
    const current = await this.prisma.plan.findUnique({ where: { id } });
    const before = current?.priceCents ?? FALLBACK_PLANS[id]?.priceCents;
    if (before === undefined) throw new NotFoundException('Plan not found');
    const base = FALLBACK_PLANS[id];
    await this.prisma.$transaction([
      this.prisma.plan.upsert({
        where: { id },
        update: { priceCents },
        create: {
          id,
          name: base.name,
          priceCents,
          currency: base.currency,
        },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          action: 'SET_PRICE',
          detail: { plan: id, fromCents: before, toCents: priceCents },
        },
      }),
    ]);
    return this.get(id);
  }
}
