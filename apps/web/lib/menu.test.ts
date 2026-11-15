import { describe, expect, it } from 'vitest';
import { menuFor } from './menu';

const hrefs = (role: Parameters<typeof menuFor>[0]) =>
  menuFor(role).map((i) => i.href);

describe('menuFor', () => {
  it('shows only the catalog to a visitor', () => {
    expect(hrefs(undefined)).toEqual(['/catalog']);
  });

  it('gives every logged-in user a cart and their orders, and a customer nothing else', () => {
    expect(hrefs('CUSTOMER')).toEqual(['/catalog', '/cart', '/orders']);
    expect(hrefs('SELLER')).toContain('/cart');
  });

  it('shows how many units are in the cart', () => {
    const label = (n: number) =>
      menuFor('CUSTOMER', n).find((i) => i.href === '/cart')?.label;
    expect(label(0)).toBe('Cart');
    expect(label(3)).toBe('Cart (3)');
  });

  it('adds product management for sellers and admins', () => {
    expect(hrefs('SELLER')).toContain('/seller/products');
    expect(hrefs('ADMIN')).toContain('/seller/products');
  });
});
