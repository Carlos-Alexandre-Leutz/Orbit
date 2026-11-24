import {
  MAX_DISTINCT_PRODUCTS,
  MAX_UNITS_PER_PRODUCT,
  brokenRule,
  type CartChange,
} from './cart-rules';

const ok: CartChange = {
  resulting: 2,
  stock: 10,
  active: true,
  lines: 3,
  alreadyInCart: false,
};
const code = (over: Partial<CartChange>) =>
  brokenRule({ ...ok, ...over })?.code ?? null;

describe('brokenRule', () => {
  it('allows an ordinary change', () => {
    expect(brokenRule(ok)).toBeNull();
  });

  it('refuses a product that is no longer on sale', () => {
    expect(code({ active: false })).toBe('UNAVAILABLE');
  });

  it('refuses a product with no stock', () => {
    expect(code({ stock: 0 })).toBe('OUT_OF_STOCK');
  });

  it('allows exactly the stock and refuses one unit more, saying how many there are', () => {
    expect(code({ stock: 4, resulting: 4 })).toBeNull();
    const broken = brokenRule({ ...ok, stock: 4, resulting: 5 });
    expect(broken?.code).toBe('NOT_ENOUGH_STOCK');
    expect(broken?.message).toContain('4');
  });

  it('allows exactly the per-product limit and refuses one more', () => {
    expect(code({ stock: 99, resulting: MAX_UNITS_PER_PRODUCT })).toBeNull();
    expect(code({ stock: 99, resulting: MAX_UNITS_PER_PRODUCT + 1 })).toBe(
      'TOO_MANY_UNITS',
    );
  });

  it('checks the unit limit before the stock, so the message is the more useful one', () => {
    expect(code({ stock: 5, resulting: 11 })).toBe('TOO_MANY_UNITS');
  });

  it('refuses a new product when the cart already has the most different products', () => {
    expect(code({ lines: MAX_DISTINCT_PRODUCTS - 1 })).toBeNull();
    expect(code({ lines: MAX_DISTINCT_PRODUCTS })).toBe('TOO_MANY_PRODUCTS');
  });

  it('lets a product already in a full cart change its quantity', () => {
    expect(
      code({ lines: MAX_DISTINCT_PRODUCTS, alreadyInCart: true }),
    ).toBeNull();
  });
});
