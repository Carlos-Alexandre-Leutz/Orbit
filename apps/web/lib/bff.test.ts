import { afterEach, describe, expect, it, vi } from 'vitest';
import { bffRequest, messageOf } from './bff';
import { bffUrl } from './config';

describe('bffUrl', () => {
  it('prefers the address the server uses inside Compose', () => {
    expect(
      bffUrl({
        BFF_URL: 'http://bff:3001/',
        NEXT_PUBLIC_BFF_URL: 'http://localhost:3001',
      }),
    ).toBe('http://bff:3001');
  });

  it('falls back to the public address and then to localhost', () => {
    expect(bffUrl({ NEXT_PUBLIC_BFF_URL: 'http://shop.test' })).toBe(
      'http://shop.test',
    );
    expect(bffUrl({})).toBe('http://localhost:3001');
  });
});

describe('messageOf', () => {
  it('reads a string, joins a list and falls back', () => {
    expect(messageOf({ message: 'Credenciais inválidas' }, 'x')).toBe(
      'Credenciais inválidas',
    );
    expect(messageOf({ message: ['a', 'b'] }, 'x')).toBe('a, b');
    expect(messageOf(null, 'fallback')).toBe('fallback');
    expect(messageOf({ message: '' }, 'fallback')).toBe('fallback');
  });
});

describe('bffRequest', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the token as a bearer token and only the query values that are set', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await bffRequest('/products', {
      token: 'abc',
      query: { q: 'pan', category: '', page: undefined },
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get('q')).toBe('pan');
    expect(url.searchParams.has('category')).toBe(false);
    expect(url.searchParams.has('page')).toBe(false);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer abc',
    );
    expect(result).toMatchObject({ ok: true, status: 200, data: { ok: true } });
  });

  it('keeps the status of an error answer and tolerates an empty body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    expect(await bffRequest('/x')).toMatchObject({
      status: 204,
      ok: true,
      data: null,
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('{"message":"no"}', { status: 403 })),
    );
    expect(await bffRequest('/x')).toMatchObject({ status: 403, ok: false });
  });

  it('answers 502 when the BFF cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    );
    expect(await bffRequest('/x')).toMatchObject({ status: 502, ok: false });
  });
});
