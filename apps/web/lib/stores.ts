import { cache } from 'react';
import { bffRequest } from './bff';

export interface Store {
  slug: string;
  name: string;
  description: string;
  tagline?: string;
  primaryColor?: string;
  logoImageId?: string | null;
  coverImageId?: string | null;
  contactEmail?: string;
  contactPhone?: string;
}

/** The store at a link, or null when no store has it (or the API cannot be reached). */
export const getStore = cache(async (slug: string): Promise<Store | null> => {
  const result = await bffRequest<Store>(`/stores/${encodeURIComponent(slug)}`);
  return result.ok ? result.data : null;
});

export async function listStores(): Promise<Store[] | null> {
  const result = await bffRequest<Store[]>('/stores');
  return result.ok ? result.data : null;
}
