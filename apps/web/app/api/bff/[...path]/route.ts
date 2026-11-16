import { NextResponse } from 'next/server';
import { bffRequest } from '@/lib/bff';
import { sessionToken } from '@/lib/auth';

/** The parts of the BFF that the browser may reach through the web server, which adds the session token. */
const ALLOWED = new Set([
  'products',
  'categories',
  'cart',
  'orders',
  'account',
  'stores',
]);

async function forward(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  if (!ALLOWED.has(path[0])) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(request.method);
  const body = hasBody
    ? await request.json().catch(() => undefined)
    : undefined;
  const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;
  const result = await bffRequest(
    `/${path.map(encodeURIComponent).join('/')}`,
    {
      method: request.method,
      body,
      query,
      token: await sessionToken(),
      headers: idempotencyKey
        ? { 'Idempotency-Key': idempotencyKey }
        : undefined,
    },
  );
  if (result.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(result.data, { status: result.status });
}

export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
