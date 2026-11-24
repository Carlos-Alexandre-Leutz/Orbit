import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseSeed, SeedFile } from './seed';

describe('parseSeed', () => {
  it('reads the real seed file of the repository', () => {
    const file = resolve(__dirname, '../../../../seed/store.json');
    const seed = parseSeed(JSON.parse(readFileSync(file, 'utf-8')) as SeedFile);
    expect(seed.categories.length).toBeGreaterThanOrEqual(5);
    expect(seed.products.length).toBeGreaterThanOrEqual(20);
    for (const product of seed.products) {
      expect(product.priceCents).toBeGreaterThan(0);
      expect(product.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it('maps the snake_case fields to the columns', () => {
    const seed = parseSeed({
      categories: [{ slug: 'a', name: 'A' }],
      products: [
        { sku: 'A-1', name: 'One', category: 'a', price_cents: 150, stock: 3 },
      ],
    });
    expect(seed.products[0]).toEqual({
      sku: 'A-1',
      name: 'One',
      description: '',
      priceCents: 150,
      stock: 3,
      categorySlug: 'a',
    });
  });

  it('refuses a product whose category does not exist', () => {
    expect(() =>
      parseSeed({
        categories: [{ slug: 'a', name: 'A' }],
        products: [
          { sku: 'B-1', name: 'x', category: 'b', price_cents: 1, stock: 1 },
        ],
      }),
    ).toThrow(/unknown category "b"/);
  });
});
