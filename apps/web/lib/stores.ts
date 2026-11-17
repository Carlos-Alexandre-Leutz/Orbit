import { cache } from 'react';
import { bffRequest } from './bff';

export interface Store {
  slug: string;
  name: string;
  description: string;
  tagline?: string;
  primaryColor?: string;
  logoImageId?: string | null;
  /** The banners at the top of the store, in order; more than one turn into a carousel. */
  bannerImageIds?: string[];
  contactEmail?: string;
  contactPhone?: string;
  /** A draft store is only visible to its owner. */
  published?: boolean;
  template?: string;
  shippingFlatCents?: number;
  freeShippingOverCents?: number | null;
  pickupEnabled?: boolean;
  /** Business days to prepare an order, and the shortest and longest trip. */
  handlingDays?: number;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
  deliveryByState?: Record<string, { min: number; max: number }>;
  paymentMethods?: string[];
  /** What the seller shows under the banner, in order. */
  highlights?: { id: string; text?: string }[];
  /** The provider the seller connected and its public key (never the secrets). */
  paymentProvider?: string | null;
  paymentPublicKey?: string | null;
  /** Closed by an Orbit admin: nobody but an admin sees the storefront. */
  suspended?: boolean;
}

/** The store at a link, or null when no store has it (or the API cannot be reached). */
export const getStore = cache(async (slug: string): Promise<Store | null> => {
  const result = await bffRequest<Store>(`/stores/${encodeURIComponent(slug)}`);
  return result.ok ? result.data : null;
});

export interface StoreCategory {
  slug: string;
  name: string;
}

/** The categories that have products on sale in a store (empty when the API cannot be reached). */
export const getStoreCategories = cache(
  async (slug: string): Promise<StoreCategory[]> => {
    const result = await bffRequest<StoreCategory[]>(
      `/stores/${encodeURIComponent(slug)}/categories`,
    );
    return result.ok ? result.data : [];
  },
);
