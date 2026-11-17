import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { loginUrl, needsSession } from '@/lib/routes';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * A first, cheap gate: pages that need a session send a visitor without the cookie to the login page.
 * The login and register pages are not gated here: they check the session themselves, so a stale cookie
 * cannot lock anyone out of them. It only checks that the cookie exists. Each page still asks the API who the user is and what the role
 * may do, because a proxy alone must not be the access control.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The owner's area lives under a secret address (ADMIN_PATH). That address is rewritten to the real folder,
  // and a direct request to the real folder is "not found", so only the secret address reaches it.
  const secret = process.env.ADMIN_PATH?.trim();
  if (secret && (pathname === `/${secret}` || pathname.startsWith(`/${secret}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = `/studio${pathname.slice(secret.length + 1)}`;
    return NextResponse.rewrite(url);
  }
  if (pathname === '/studio' || pathname.startsWith('/studio/')) {
    return NextResponse.rewrite(new URL('/not-found-here', request.url));
  }

  if (needsSession(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(
      new URL(loginUrl(`${pathname}${search}`), request.url),
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
