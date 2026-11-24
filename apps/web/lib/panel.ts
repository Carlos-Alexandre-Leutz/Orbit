import { bffRequest } from './bff';
import { sessionToken } from './auth';
import type { Order } from './orders-shared';

export interface OwnStore {
  slug: string;
  name: string;
  description: string;
  tagline: string;
  primaryColor: string;
  logoImageId: string | null;
  bannerImageIds: string[];
  contactEmail: string;
  contactPhone: string;
  published: boolean;
  template: string;
  sellingModes: string[];
  shippingFlatCents: number;
  freeShippingOverCents: number | null;
  pickupEnabled: boolean;
  handlingDays: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  deliveryByState: Record<string, { min: number; max: number }>;
  paymentMethods: string[];
  highlights: { id: string; text?: string }[];
  /** "stripe" or "mercadopago" once the seller connected one; the secrets are never sent back. */
  paymentProvider: string | null;
  paymentPublicKey: string | null;
  paymentConnected: boolean;
  suspended: boolean;
}

export interface Summary {
  products: number;
  categories: number;
  lowStock: number;
  lowStockLimit: number;
  customers: number;
  revenueCents: number;
  orders: Partial<Record<string, number>>;
}

export interface StoreOrder extends Order {
  customer: { name: string | null; email: string };
}

export interface StoreCustomer {
  name: string | null;
  email: string;
  joinedAt: string;
  marketingConsent: boolean;
  orders: number;
  spentCents: number;
}

async function seller<T>(path: string): Promise<T | null> {
  const token = await sessionToken();
  if (!token) return null;
  const result = await bffRequest<T>(path, { token });
  return result.ok ? result.data : null;
}

export const getOwnStore = () => seller<OwnStore>('/stores/mine');
export const getSummary = () => seller<Summary>('/stores/mine/summary');
export const getStoreOrders = () => seller<StoreOrder[]>('/orders/store');
export const getStoreCustomers = () =>
  seller<StoreCustomer[]>('/store-customers');

export interface OwnCategory {
  id: string;
  slug: string;
  name: string;
  /** Products on sale in it; a category with none is not shown in the store. */
  products: number;
}

export const getOwnCategories = () => seller<OwnCategory[]>('/categories/mine');
