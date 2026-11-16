import { bffRequest } from './bff';
import { sessionToken } from './auth';
import type { Order } from './orders-shared';

export interface OwnStore {
  slug: string;
  name: string;
  description: string;
}

export interface Summary {
  products: number;
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
