import { NextResponse } from 'next/server';
import { bffRequest } from '@/lib/bff';
import { sessionToken } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

/** Deletes the customer account at the API, then drops the session cookie so the browser is signed out. */
export async function POST() {
  const result = await bffRequest('/account', {
    method: 'DELETE',
    token: await sessionToken(),
  });
  if (!result.ok) {
    return NextResponse.json(
      { message: 'The account could not be deleted. Try again.' },
      { status: result.status },
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE,
    '',
    sessionCookieOptions(process.env.APP_URL, 0),
  );
  return response;
}
