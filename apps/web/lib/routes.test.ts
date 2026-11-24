import { describe, expect, it } from 'vitest';
import { loginUrl, needsSession } from './routes';

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

describe('loginUrl', () => {
  it('sends a visitor of a store to that store login', () => {
    expect(loginUrl('/loja/cart')).toBe('/loja/login?next=%2Floja%2Fcart');
  });

  it('sends the staff pages to the platform login', () => {
    expect(loginUrl('/seller/products')).toBe(
      '/login?next=%2Fseller%2Fproducts',
    );
    expect(loginUrl('/account')).toBe('/login?next=%2Faccount');
  });
});
