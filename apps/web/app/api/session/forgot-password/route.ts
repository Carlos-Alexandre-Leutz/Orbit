import { NextResponse } from 'next/server';
import { bffRequest, messageOf } from '@/lib/bff';

/** Asks the BFF to send the reset e-mail. The browser only talks to this site, like the login and register pages. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  if (!body || typeof body.email !== 'string') {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
  const result = await bffRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: body.email },
  });
  if (!result.ok) {
    return NextResponse.json(
      { message: messageOf(result.data, 'Could not send the e-mail') },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
