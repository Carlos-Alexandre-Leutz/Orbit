import type { Role } from './auth';

export interface MenuItem {
  href: string;
  label: string;
}

export interface MenuContext {
  /** The store the visitor is looking at, taken from the address. */
  store?: { slug: string; name: string } | null;
  /** Units in the customer's cart in that store. */
  cartCount?: number;
  /** The store a seller owns. */
  ownStore?: { slug: string; name: string } | null | undefined;
}

/**
 * What the menu offers. Hiding a link is a courtesy: each page still checks the role on the server.
 * Only customers buy, so only they get a cart and orders, and those belong to the store they are in.
 */
export function menuFor(
  role: Role | undefined,
  { store, cartCount = 0, ownStore }: MenuContext = {},
): MenuItem[] {
  const items: MenuItem[] = [{ href: '/', label: 'Stores' }];
  if (store) items.push({ href: `/${store.slug}`, label: store.name });
  if (role === 'CUSTOMER' && store) {
    items.push({
      href: `/${store.slug}/cart`,
      label: cartCount > 0 ? `Cart (${cartCount})` : 'Cart',
    });
    items.push({ href: `/${store.slug}/orders`, label: 'Orders' });
  }
  if (role === 'CUSTOMER') {
    items.push({ href: '/account', label: 'My account' });
  }
  if (role === 'SELLER' && ownStore && ownStore.slug !== store?.slug) {
    items.push({ href: `/${ownStore.slug}`, label: 'My store' });
  }
  if (role === 'SELLER') {
    items.push({ href: '/panel', label: 'Panel' });
  }
  return items;
}
