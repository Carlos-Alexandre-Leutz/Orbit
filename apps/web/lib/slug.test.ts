import { describe, expect, it } from 'vitest';
import { slugFromName } from './slug';

describe('slugFromName', () => {
  it('turns a store name into a link', () => {
    expect(slugFromName('Loja do João')).toBe('loja-do-joao');
    expect(slugFromName('  Café & Cia!! ')).toBe('cafe-cia');
  });

  it('keeps it within the limit without a trailing hyphen', () => {
    const slug = slugFromName('a '.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
  });
});
