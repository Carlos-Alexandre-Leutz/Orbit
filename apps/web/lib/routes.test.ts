import { describe, expect, it } from 'vitest';
import { needsSession } from './routes';

describe('needsSession', () => {
  it('asks for a session on the cart, checkout and orders of a store', () => {
    for (const part of ['cart', 'checkout', 'orders']) {
      expect(needsSession(`/loja/${part}`)).toBe(true);
    }
    expect(needsSession('/loja/orders/123')).toBe(true);
  });

  it('asks for a session on the staff pages', () => {
    expect(needsSession('/seller/products')).toBe(true);
    expect(needsSession('/dashboard')).toBe(true);
  });

  it('leaves the home page, stores, products and login open', () => {
    for (const path of [
      '/',
      '/loja',
      '/loja/products/abc',
      '/login',
      '/register',
    ]) {
      expect(needsSession(path)).toBe(false);
    }
  });
});
