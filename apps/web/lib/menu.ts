import type { Role } from './auth';

export interface MenuItem {
  href: string;
  label: string;
}

/** What the menu offers. Hiding a link is a courtesy: each page still checks the role on the server. */
export function menuFor(role: Role | undefined, cartCount = 0): MenuItem[] {
  const items: MenuItem[] = [{ href: '/catalog', label: 'Catalog' }];
  if (role) {
    items.push({
      href: '/cart',
      label: cartCount > 0 ? `Cart (${cartCount})` : 'Cart',
    });
  }
  if (role === 'SELLER' || role === 'ADMIN') {
    items.push({ href: '/seller/products', label: 'Manage products' });
  }
  return items;
}
