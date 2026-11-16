import { NextResponse } from 'next/server';
import { bffRequest, messageOf } from '@/lib/bff';

/** Sets the new password with the token from the e-mail. The browser only talks to this site, like the other auth pages. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    newPassword?: unknown;
  } | null;
  if (
    !body ||
    typeof body.token !== 'string' ||
    typeof body.newPassword !== 'string'
  ) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
  const result = await bffRequest('/auth/reset-password', {
    method: 'POST',
    body: { token: body.token, newPassword: body.newPassword },
  });
  if (!result.ok) {
    return NextResponse.json(
      { message: messageOf(result.data, 'Error resetting the password.') },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
