import { cache } from 'react';
import { cookies } from 'next/headers';
import { bffRequest } from './bff';
import { SESSION_COOKIE } from './session';

export type Role = 'CUSTOMER' | 'SELLER' | 'ADMIN';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isAnonymous: boolean;
  /** The store of a seller; null for everyone else. */
  store?: { slug: string; name: string } | null;
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** The logged-in user, or null. The BFF checks the token on every call, so an expired session is just "no user". */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await sessionToken();
  if (!token) return null;
  const result = await bffRequest<CurrentUser>('/auth/me', { token });
  return result.ok ? result.data : null;
});

export function canManageProducts(role: Role | undefined): boolean {
  return role === 'SELLER' || role === 'ADMIN';
}
