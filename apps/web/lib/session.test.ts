import { describe, expect, it } from 'vitest';
import { safeNext, sessionCookieOptions, tokenMaxAge } from './session';

const token = (payload: object) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;

describe('sessionCookieOptions', () => {
  it('is never readable by page scripts and is not sent across sites', () => {
    const options = sessionCookieOptions('http://localhost:3000', 60);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(60);
  });

  it('is marked secure only when the site is served over https', () => {
    expect(sessionCookieOptions('https://shop.example.com', 1).secure).toBe(
      true,
    );
    expect(sessionCookieOptions('http://localhost:3000', 1).secure).toBe(false);
    expect(sessionCookieOptions(undefined, 1).secure).toBe(false);
  });
});

describe('tokenMaxAge', () => {
  it('lasts until the exp of the token', () => {
    const now = 1_000_000_000_000;
    expect(tokenMaxAge(token({ exp: now / 1000 + 600 }), now)).toBe(600);
  });

  it('never goes below zero for a token that already expired', () => {
    const now = 1_000_000_000_000;
    expect(tokenMaxAge(token({ exp: now / 1000 - 5 }), now)).toBe(0);
  });

  it('falls back to an hour for a token it cannot read', () => {
    expect(tokenMaxAge('not-a-token')).toBe(3600);
    expect(tokenMaxAge(token({ sub: 'x' }))).toBe(3600);
  });
});

describe('safeNext', () => {
  it('keeps a path on this site', () => {
    expect(safeNext('/seller/products?page=2')).toBe('/seller/products?page=2');
  });

  it.each([
    'https://evil.example.com',
    '//evil.example.com',
    '/\\evil.example.com',
    'javascript:alert(1)',
    '',
    null,
    undefined,
  ])('refuses %s and goes to the default page', (value) => {
    expect(safeNext(value as string | null | undefined)).toBe('/catalog');
  });
});
