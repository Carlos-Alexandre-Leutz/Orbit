import { describe, expect, it } from 'vitest';
import { menuFor } from './menu';

const hrefs = (role: Parameters<typeof menuFor>[0]) =>
  menuFor(role).map((i) => i.href);

describe('menuFor', () => {
  it('shows only the catalog to a visitor', () => {
    expect(hrefs(undefined)).toEqual(['/catalog']);
  });

  it('gives a customer a cart and their orders, and nothing else', () => {
    expect(hrefs('CUSTOMER')).toEqual(['/catalog', '/cart', '/orders']);
  });

  it('shows how many units are in the cart', () => {
    const label = (n: number) =>
      menuFor('CUSTOMER', n).find((i) => i.href === '/cart')?.label;
    expect(label(0)).toBe('Cart');
    expect(label(3)).toBe('Cart (3)');
  });

  it('gives sellers and admins no cart and no orders, because they do not buy', () => {
    for (const role of ['SELLER', 'ADMIN'] as const) {
      expect(hrefs(role)).not.toContain('/cart');
      expect(hrefs(role)).not.toContain('/orders');
    }
  });

  it('adds product management for sellers and admins', () => {
    expect(hrefs('SELLER')).toContain('/seller/products');
    expect(hrefs('ADMIN')).toContain('/seller/products');
  });
});
