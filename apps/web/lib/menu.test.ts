import { describe, expect, it } from 'vitest';
import { menuFor } from './menu';

const joao = { slug: 'loja-do-joao', name: 'Loja do João' };
const hrefs = (...args: Parameters<typeof menuFor>) =>
  menuFor(...args).map((i) => i.href);

describe('menuFor', () => {
  it('shows nothing to a visitor outside a store, and never a list of stores', () => {
    expect(hrefs(undefined)).toEqual([]);
    expect(hrefs('SELLER')).not.toContain('/');
  });

  it('shows the store the visitor is in, and no cart', () => {
    expect(hrefs(undefined, { store: joao })).toEqual(['/loja-do-joao']);
  });

  it('gives a customer in a store the cart and the orders of that store', () => {
    expect(hrefs('CUSTOMER', { store: joao })).toEqual([
      '/loja-do-joao',
      '/loja-do-joao/cart',
      '/loja-do-joao/orders',
      '/account',
      '/sell',
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
    expect(hrefs('CUSTOMER')).toEqual(['/account', '/sell']);
  });

  it('gives admins no cart and no orders, even inside a store', () => {
    const all = hrefs('ADMIN', { store: joao });
    expect(all.some((h) => h.endsWith('/cart'))).toBe(false);
    expect(all.some((h) => h.endsWith('/orders'))).toBe(false);
  });

  it('lets a seller shop like a customer: cart, orders and the account', () => {
    expect(hrefs('SELLER', { store: joao })).toEqual([
      '/loja-do-joao',
      '/loja-do-joao/cart',
      '/loja-do-joao/orders',
      '/account',
      '/panel',
    ]);
  });

  it('adds the panel and a link to their own store for a seller', () => {
    expect(hrefs('SELLER', { ownStore: joao })).toEqual([
      '/account',
      '/loja-do-joao',
      '/panel',
    ]);
    expect(hrefs('ADMIN')).not.toContain('/panel');
  });

  it('gives an admin who owns a store the link to it', () => {
    expect(hrefs('ADMIN', { ownStore: joao })).toContain('/loja-do-joao');
  });

  it('does not repeat the own store of a seller who is looking at it', () => {
    const all = hrefs('SELLER', { store: joao, ownStore: joao });
    expect(all.filter((h) => h === '/loja-do-joao')).toHaveLength(1);
  });
});
