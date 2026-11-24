import { NextResponse } from 'next/server';
import { sessionToken } from '@/lib/auth';
import { bffUrl } from '@/lib/config';

/**
 * The chat of the assistant. The page talks to this route, which adds the session token and passes the
 * event stream from the BFF on as it arrives, so the browser never holds the token.
 */
export async function POST(request: Request) {
  const token = await sessionToken();
  if (!token) {
    return NextResponse.json(
      { message: 'Sign in to use the assistant' },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${bffUrl()}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: 'The server is not reachable' },
      { status: 502 },
    );
  }
  if (!upstream.ok || !upstream.body) {
    const error = (await upstream.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message;
    return NextResponse.json(
      { message: message ?? 'The assistant is not available' },
      { status: upstream.status || 502 },
    );
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
