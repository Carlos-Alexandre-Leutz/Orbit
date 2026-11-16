import { cache } from 'react';
import { bffRequest } from './bff';
import { sessionToken } from './auth';

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  /** The cover picture of the product, when it has one. */
  imageId: string | null;
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

/** The logged-in customer's cart in a store, or null when there is no session or the API cannot be reached. */
export const getCart = cache(async (store: string): Promise<Cart | null> => {
  const token = await sessionToken();
  if (!token) return null;
  const result = await bffRequest<Cart>('/cart', {
    token,
    query: { store },
  });
  return result.ok ? result.data : null;
});
