import { NextResponse } from 'next/server';
import { bffRequest, messageOf } from '@/lib/bff';
import { sessionToken } from '@/lib/auth';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  tokenMaxAge,
} from '@/lib/session';

/**
 * The account names its store. The answer carries a new session, because naming a store makes the account a
 * seller and the role lives in the token; the cookie is replaced here and the page only gets the store.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
  const result = await bffRequest<{
    accessToken: string;
    store: unknown;
  }>('/auth/store', {
    method: 'POST',
    body,
    token: await sessionToken(),
  });
  if (!result.ok) {
    return NextResponse.json(
      { message: messageOf(result.data, 'Could not create your store') },
      { status: result.status },
    );
  }
  const response = NextResponse.json({ store: result.data.store });
  response.cookies.set(
    SESSION_COOKIE,
    result.data.accessToken,
    sessionCookieOptions(
      process.env.APP_URL,
      tokenMaxAge(result.data.accessToken),
    ),
  );
  return response;
}
