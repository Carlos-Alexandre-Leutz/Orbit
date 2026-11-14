import { describe, expect, it } from 'vitest';
import { menuFor } from './menu';

const hrefs = (role: Parameters<typeof menuFor>[0]) =>
  menuFor(role).map((i) => i.href);

describe('menuFor', () => {
  it('shows only the catalog to a visitor and to a customer', () => {
    expect(hrefs(undefined)).toEqual(['/catalog']);
    expect(hrefs('CUSTOMER')).toEqual(['/catalog']);
  });

  it('adds product management for sellers and admins', () => {
    expect(hrefs('SELLER')).toContain('/seller/products');
    expect(hrefs('ADMIN')).toContain('/seller/products');
  });
});
