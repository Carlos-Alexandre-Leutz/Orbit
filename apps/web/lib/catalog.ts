export interface Category {
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  active: boolean;
  category: Category;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
] as const;

export const PAGE_SIZE = 12;

export interface CatalogParams {
  q: string;
  category: string;
  inStock: boolean;
  sort: string;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/** Reads the address bar. Anything unexpected falls back to a safe default instead of reaching the API. */
export function parseCatalogParams(raw: RawParams): CatalogParams {
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).trim().slice(0, 100),
    category: first(raw.category).slice(0, 60),
    inStock: first(raw.inStock) === 'true',
    sort: SORTS.some((s) => s.value === sort) ? sort : 'name',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** The address of a catalog page, keeping only what differs from the defaults, so links stay short and shareable. */
export function catalogHref(
  params: CatalogParams,
  change: Partial<CatalogParams> = {},
): string {
  const next = { ...params, ...change };
  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.category) query.set('category', next.category);
  if (next.inStock) query.set('inStock', 'true');
  if (next.sort !== 'name') query.set('sort', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  const text = query.toString();
  return text ? `/catalog?${text}` : '/catalog';
}

/** Prices are whole cents; the store has one currency. */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
