export const SESSION_COOKIE = 'orbit_session';

/**
 * The session token travels in an httpOnly cookie: page scripts cannot read it, so a script injected
 * into a page cannot steal it. `secure` is on when the site is served over https.
 */
export function sessionCookieOptions(
  appUrl: string | undefined,
  maxAgeSeconds: number,
) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: (appUrl ?? '').startsWith('https://'),
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/** Seconds until the token expires, read from its `exp` claim (not verified here: the API verifies it). */
export function tokenMaxAge(token: string, now: number = Date.now()): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf-8'),
    ) as { exp?: unknown };
    if (typeof payload.exp === 'number') {
      return Math.max(0, Math.floor(payload.exp - now / 1000));
    }
  } catch {
    // fall through to the default
  }
  return 3600;
}

/** Only a path on this site is a valid place to go back to after login; anything else could send the user elsewhere. */
export function safeNext(
  value: string | null | undefined,
  fallback = '/catalog',
): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return fallback;
  }
  return value;
}
