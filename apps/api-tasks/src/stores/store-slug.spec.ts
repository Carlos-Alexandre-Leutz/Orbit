import {
  RESERVED_SLUGS,
  SLUG_MAX,
  checkSlug,
  slugFromName,
} from './store-slug';

describe('checkSlug', () => {
  it.each(['lojadojao', 'loja-do-joao', 'shop2', 'a1b'])('accepts %s', (s) => {
    expect(checkSlug(s)).toBeNull();
  });

  it('refuses a link that is too short or too long', () => {
    expect(checkSlug('ab')).toBe('TOO_SHORT');
    expect(checkSlug('a'.repeat(SLUG_MAX + 1))).toBe('TOO_LONG');
    expect(checkSlug('a'.repeat(SLUG_MAX))).toBeNull();
  });

  it.each(['Loja', 'loja_x', 'loja x', '-loja', 'loja-', 'lo--ja', 'lója'])(
    'refuses the bad shape %s',
    (s) => {
      expect(checkSlug(s)).toBe('BAD_SHAPE');
    },
  );

  it('refuses every reserved word that is a valid shape', () => {
    for (const word of RESERVED_SLUGS.filter((w) => w.length >= 3)) {
      const problem = checkSlug(word);
      expect(['RESERVED', 'BAD_SHAPE']).toContain(problem);
    }
    expect(checkSlug('login')).toBe('RESERVED');
    expect(checkSlug('panel')).toBe('RESERVED');
    expect(checkSlug('api')).toBe('RESERVED');
  });
});

describe('slugFromName', () => {
  it('lower-cases, removes accents and joins words with hyphens', () => {
    expect(slugFromName('Loja do João!')).toBe('loja-do-joao');
    expect(slugFromName('  Café   & Cia ')).toBe('cafe-cia');
  });

  it('never ends with a hyphen after cutting to the maximum length', () => {
    const slug = slugFromName(`${'a'.repeat(SLUG_MAX - 1)} b`);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
  });
});

describe('links of the sign-up and account pages', () => {
  it('reserves sell and account', () => {
    expect(checkSlug('sell')).toBe('RESERVED');
    expect(checkSlug('account')).toBe('RESERVED');
  });
});
