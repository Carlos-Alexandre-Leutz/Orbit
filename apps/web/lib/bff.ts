import { bffUrl } from './config';

export interface BffResult<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
}

/** The BFF answers `message` as a string or, for invalid input, as a list of strings. */
export function messageOf(data: unknown, fallback: string): string {
  const message = (data as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' && message ? message : fallback;
}

/** Calls the BFF from the web server. The token, when there is one, goes as a bearer token. */
export async function bffRequest<T = unknown>(
  path: string,
  options: {
    method?: string | undefined;
    body?: unknown;
    token?: string | undefined;
    query?: Record<string, string | undefined> | undefined;
  } = {},
): Promise<BffResult<T>> {
  const url = new URL(`${bffUrl()}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, value);
  }
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  try {
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
      cache: 'no-store',
    };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);
    const response = await fetch(url, init);
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { status: response.status, ok: response.ok, data: data as T };
  } catch {
    return {
      status: 502,
      ok: false,
      data: { message: 'The server is not reachable' } as T,
    };
  }
}
