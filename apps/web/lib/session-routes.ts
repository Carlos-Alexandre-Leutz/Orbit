import { NextResponse } from 'next/server';
import { bffRequest, messageOf } from './bff';
import { SESSION_COOKIE, sessionCookieOptions, tokenMaxAge } from './session';

interface SessionBody {
  accessToken: string;
  user: unknown;
}

/** Shared by login and register: ask the BFF, then keep the token in a cookie and give the page only the user. */
export async function startSession(
  path: '/auth/login' | '/auth/register',
  request: Request,
) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
  const result = await bffRequest<SessionBody>(path, { method: 'POST', body });
  if (!result.ok) {
    return NextResponse.json(
      { message: messageOf(result.data, 'Could not sign in') },
      { status: result.status },
    );
  }
  const { accessToken, user } = result.data;
  const response = NextResponse.json({ user }, { status: 200 });
  response.cookies.set(
    SESSION_COOKIE,
    accessToken,
    sessionCookieOptions(process.env.APP_URL, tokenMaxAge(accessToken)),
  );
  return response;
}
