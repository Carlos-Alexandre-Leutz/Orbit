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
 * Every account but an admin shops (a seller too, since one account can own a store and buy in others), so they get
 * a cart and orders, which belong to the store they are in.
 */
export function menuFor(
  role: Role | undefined,
  { store, cartCount = 0, ownStore }: MenuContext = {},
): MenuItem[] {
  // No "Stores" entry: a store is reached by its own link, so nobody browses the stores of other sellers.
  const items: MenuItem[] = [];
  if (store) items.push({ href: `/${store.slug}`, label: store.name });
  const shops = role === 'CUSTOMER' || role === 'SELLER';
  if (shops && store) {
    items.push({
      href: `/${store.slug}/cart`,
      label: cartCount > 0 ? `Cart (${cartCount})` : 'Cart',
    });
    items.push({ href: `/${store.slug}/orders`, label: 'Orders' });
  }
  if (shops) {
    items.push({ href: '/account', label: 'My account' });
  }
  if (role !== 'ADMIN' && ownStore && ownStore.slug !== store?.slug) {
    items.push({ href: `/${ownStore.slug}`, label: 'My store' });
  }
  if (role === 'SELLER') {
    items.push({ href: '/panel', label: 'Panel' });
  } else if (role === 'CUSTOMER') {
    // The same account can open a store of its own.
    items.push({ href: '/sell', label: 'Open a store' });
  }
  return items;
}
