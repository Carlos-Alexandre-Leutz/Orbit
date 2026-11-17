import { bffRequest } from './bff';
import { sessionToken } from './auth';

export interface BillingStatus {
  /** Orbit's billing account is set up on this server. */
  configured: boolean;
  /** pending, authorized, paused or cancelled; null before the seller started. */
  status: string | null;
  trialEndsAt: string | null;
  /** The store may be opened to the public. */
  canPublish: boolean;
  plan: { id: string; name: string; priceCents: number; currency: string };
  trialDays: number;
}

export async function getBillingStatus(): Promise<BillingStatus | null> {
  const token = await sessionToken();
  if (!token) return null;
  const result = await bffRequest<BillingStatus>('/billing/mine', { token });
  return result.ok ? result.data : null;
}
