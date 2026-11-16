import { bffRequest } from './bff';
import { sessionToken } from './auth';

export interface JoinedStore {
  store: { slug: string; name: string };
  marketingConsent: boolean;
  joinedAt: string;
}

/** The stores the logged-in customer joined or bought from, with the consent given to each. */
export async function getJoinedStores(): Promise<JoinedStore[] | null> {
  const token = await sessionToken();
  if (!token) return null;
  const result = await bffRequest<JoinedStore[]>('/account/stores', { token });
  return result.ok ? result.data : null;
}
