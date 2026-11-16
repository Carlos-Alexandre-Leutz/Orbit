import { cache } from 'react';
import { bffRequest } from './bff';
import { sessionToken } from './auth';
import type { Order } from './orders-shared';

/** The logged-in user's orders in a store, newest first, or null when there is no session or the API cannot be reached. */
export const getOrders = cache(
  async (store: string): Promise<Order[] | null> => {
    const token = await sessionToken();
    if (!token) return null;
    const result = await bffRequest<Order[]>('/orders', {
      token,
      query: { store },
    });
    return result.ok ? result.data : null;
  },
);

/** One order, or null when it does not exist, is not the user's, or the API cannot be reached. */
export async function getOrder(id: string): Promise<Order | null> {
  const token = await sessionToken();
  if (!token) return null;
  const result = await bffRequest<Order>(`/orders/${encodeURIComponent(id)}`, {
    token,
  });
  return result.ok ? result.data : null;
}

/** The logged-in customer's orders in every store, newest first. */
export async function getAllOrders(): Promise<Order[] | null> {
  const token = await sessionToken();
  if (!token) return null;
  const result = await bffRequest<Order[]>('/orders', { token });
  return result.ok ? result.data : null;
}
