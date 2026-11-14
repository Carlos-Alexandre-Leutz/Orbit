import { cache } from 'react';
import { bffRequest } from './bff';
import { sessionToken } from './auth';

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  priceCents: number;
  quantity: number;
  stock: number;
  available: boolean;
  lineTotalCents: number;
}

export interface Cart {
  items: CartLine[];
  itemCount: number;
  totalCents: number;
}

/** The logged-in user's cart, or null when there is no session or the API cannot be reached. */
export const getCart = cache(async (): Promise<Cart | null> => {
  const token = await sessionToken();
  if (!token) return null;
  const result = await bffRequest<Cart>('/cart', { token });
  return result.ok ? result.data : null;
});
