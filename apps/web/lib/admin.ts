import { bffRequest } from './bff';
import { sessionToken } from './auth';

export interface AdminStore {
  slug: string;
  name: string;
  published: boolean;
  createdAt: string;
  owner: { id: string; email: string; name: string | null };
  plan: { id: string; name: string; priceCents: number; currency: string };
  paidUntil: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  /** The plan is paid for today (a subscription on, or a recorded payment). */
  paid: boolean;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  paymentConnected: boolean;
  orders: number;
}

export interface AdminStoreDetail extends AdminStore {
  history: {
    id: string;
    action: 'RECORD_PAYMENT' | 'SUSPEND' | 'REACTIVATE';
    detail: Record<string, unknown>;
    createdAt: string;
  }[];
}

export interface AdminOverview {
  stores: number;
  paying: number;
  suspended: number;
  monthlyCents: number;
  currency: string;
}

/**
 * The secret address of the owner's area, from `ADMIN_PATH` in the environment (never in the code or the
 * repository). Without it the area does not exist: every page and call answers "not found".
 */
export function adminPath(): string | null {
  const path = process.env.ADMIN_PATH?.trim();
  return path && /^[a-z0-9][a-z0-9-]{3,31}$/.test(path) ? path : null;
}

async function admin<T>(path: string): Promise<T | null> {
  const base = adminPath();
  if (!base) return null;
  const result = await bffRequest<T>(`/${base}${path}`, {
    token: await sessionToken(),
  });
  if (!result.ok) {
    // The status and the part after the secret address only: the address itself never goes to a log.
    console.error(`[owner area] ${path} answered ${result.status}`, result.data);
  }
  return result.ok ? result.data : null;
}

export interface AdminPlan {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
}

export const getAdminPlans = () => admin<AdminPlan[]>('/plans');
export const getAdminOverview = () => admin<AdminOverview>('/overview');
export const getAdminStores = () => admin<AdminStore[]>('/stores');
export const getAdminStore = (slug: string) =>
  admin<AdminStoreDetail>(`/stores/${encodeURIComponent(slug)}`);

/** Money of the plans: in the currency the plan is charged in, not the store's. */
export function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(
    cents / 100,
  );
}
