/** The plan that exists today, and its price when the database has none (the database wins; see PlansService). */
export interface PlanInfo {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
}

export const DEFAULT_PLAN = 'pro';

export const FALLBACK_PLANS: Record<string, PlanInfo> = {
  pro: { id: 'pro', name: 'Orbit Pro', priceCents: 1500, currency: 'BRL' },
};
