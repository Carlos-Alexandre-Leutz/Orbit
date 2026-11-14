import type { OrderStatus } from '@prisma/client';
import { canTransition, TRANSITIONS } from './order-state';

const ALL = Object.keys(TRANSITIONS) as OrderStatus[];

describe('order state machine', () => {
  const allowed: Array<[OrderStatus, OrderStatus]> = [
    ['PENDING_PAYMENT', 'PAID'],
    ['PENDING_PAYMENT', 'CANCELLED'],
    ['PAID', 'SHIPPED'],
    ['PAID', 'CANCELLED'],
    ['SHIPPED', 'DELIVERED'],
  ];

  it.each(allowed)('allows %s to %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it('refuses every other move, in every direction (all 25 pairs are decided)', () => {
    const refused = ALL.flatMap((from) =>
      ALL.map((to) => [from, to] as const),
    ).filter(([from, to]) => !allowed.some(([a, b]) => a === from && b === to));
    expect(refused).toHaveLength(ALL.length * ALL.length - allowed.length);
    for (const [from, to] of refused) {
      expect([from, to, canTransition(from, to)]).toEqual([from, to, false]);
    }
  });

  it('has no way out of the two final states', () => {
    expect(TRANSITIONS.DELIVERED).toEqual([]);
    expect(TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('cannot skip a step: a pending order is not shipped, a paid one is not delivered', () => {
    expect(canTransition('PENDING_PAYMENT', 'SHIPPED')).toBe(false);
    expect(canTransition('PAID', 'DELIVERED')).toBe(false);
  });

  it('cannot go backwards', () => {
    expect(canTransition('PAID', 'PENDING_PAYMENT')).toBe(false);
    expect(canTransition('DELIVERED', 'SHIPPED')).toBe(false);
  });
});
