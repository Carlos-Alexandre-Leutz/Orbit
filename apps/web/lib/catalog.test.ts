import { describe, expect, it } from 'vitest';
import {
  catalogHref,
  formatPrice,
  pageCount,
  parseCatalogParams,
} from './catalog';

describe('parseCatalogParams', () => {
  it('uses the defaults for an empty address', () => {
    expect(parseCatalogParams({})).toEqual({
      q: '',
      category: '',
      inStock: false,
      sort: 'name',
      page: 1,
    });
  });

  it('reads valid values and trims the search', () => {
    expect(
      parseCatalogParams({
        q: '  cast iron ',
        category: 'kitchen',
        inStock: 'true',
        sort: 'price_asc',
        page: '3',
      }),
    ).toEqual({
      q: 'cast iron',
      category: 'kitchen',
      inStock: true,
      sort: 'price_asc',
      page: 3,
    });
  });

  it('falls back for an unknown sort and for a bad page', () => {
    expect(parseCatalogParams({ sort: 'cheapest' }).sort).toBe('name');
    for (const page of ['0', '-2', 'abc', '']) {
      expect(parseCatalogParams({ page }).page).toBe(1);
    }
  });

  it('takes the first value of a repeated parameter and cuts a very long search', () => {
    expect(parseCatalogParams({ q: ['a', 'b'] }).q).toBe('a');
    expect(parseCatalogParams({ q: 'x'.repeat(500) }).q).toHaveLength(100);
  });
});

describe('catalogHref', () => {
  const base = parseCatalogParams({});

  it('is the bare catalog when everything is default', () => {
    expect(catalogHref(base)).toBe('/catalog');
  });

  it('keeps only what differs from the defaults', () => {
    expect(catalogHref(base, { q: 'pan', page: 2 })).toBe(
      '/catalog?q=pan&page=2',
    );
    expect(catalogHref(base, { inStock: true, sort: 'newest' })).toBe(
      '/catalog?inStock=true&sort=newest',
    );
  });

  it('encodes what the visitor typed', () => {
    expect(catalogHref(base, { q: 'a&b=c d' })).toBe('/catalog?q=a%26b%3Dc+d');
  });
});

describe('formatPrice and pageCount', () => {
  it('shows cents as dollars', () => {
    expect(formatPrice(3490)).toBe('$34.90');
    expect(formatPrice(5)).toBe('$0.05');
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('always has at least one page', () => {
    expect(pageCount(0, 12)).toBe(1);
    expect(pageCount(12, 12)).toBe(1);
    expect(pageCount(13, 12)).toBe(2);
  });
});
