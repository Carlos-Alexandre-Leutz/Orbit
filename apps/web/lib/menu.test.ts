import { describe, expect, it } from 'vitest';
import { menuFor } from './menu';

const joao = { slug: 'loja-do-joao', name: 'Loja do João' };
const hrefs = (...args: Parameters<typeof menuFor>) =>
  menuFor(...args).map((i) => i.href);

describe('menuFor', () => {
  it('shows only the stores to a visitor outside a store', () => {
    expect(hrefs(undefined)).toEqual(['/']);
  });

  it('shows the store the visitor is in, and no cart', () => {
    expect(hrefs(undefined, { store: joao })).toEqual(['/', '/loja-do-joao']);
  });

  it('gives a customer in a store the cart and the orders of that store', () => {
    expect(hrefs('CUSTOMER', { store: joao })).toEqual([
      '/',
      '/loja-do-joao',
      '/loja-do-joao/cart',
      '/loja-do-joao/orders',
    ]);
  });

  it('shows how many units are in the cart of the store', () => {
    const label = (n: number) =>
      menuFor('CUSTOMER', { store: joao, cartCount: n }).find((i) =>
        i.href.endsWith('/cart'),
      )?.label;
    expect(label(0)).toBe('Cart');
    expect(label(3)).toBe('Cart (3)');
  });

  it('gives a customer outside a store no cart, because a cart belongs to a store', () => {
    expect(hrefs('CUSTOMER')).toEqual(['/']);
  });

  it('gives sellers and admins no cart and no orders, even inside a store', () => {
    for (const role of ['SELLER', 'ADMIN'] as const) {
      const all = hrefs(role, { store: joao });
      expect(all.some((h) => h.endsWith('/cart'))).toBe(false);
      expect(all.some((h) => h.endsWith('/orders'))).toBe(false);
    }
  });

  it('adds product management and a link to their own store for a seller', () => {
    expect(hrefs('SELLER', { ownStore: joao })).toEqual([
      '/',
      '/loja-do-joao',
      '/seller/products',
    ]);
    expect(hrefs('ADMIN')).toContain('/seller/products');
  });

  it('does not repeat the own store of a seller who is looking at it', () => {
    expect(hrefs('SELLER', { store: joao, ownStore: joao })).toEqual([
      '/',
      '/loja-do-joao',
      '/seller/products',
    ]);
  });
});
