import { describe, expect, it } from 'vitest';
import { needsSession, storeSlugFromPath } from './routes';

describe('storeSlugFromPath', () => {
  it('reads the store link from the first part of the address', () => {
    expect(storeSlugFromPath('/loja-do-joao')).toBe('loja-do-joao');
    expect(storeSlugFromPath('/loja-do-joao/cart')).toBe('loja-do-joao');
    expect(storeSlugFromPath('/loja-do-joao/products/abc')).toBe(
      'loja-do-joao',
    );
  });

  it('is null for the home page and the fixed pages of the site', () => {
    for (const path of ['/', '/login', '/seller/products', '/cart', '/api/x']) {
      expect(storeSlugFromPath(path)).toBeNull();
    }
  });
});

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
