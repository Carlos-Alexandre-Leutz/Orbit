import { bffUrl } from '@/lib/config';

/** Serves a picture from the BFF, so the browser only ever talks to this site. Pictures are public. */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const upstream = await fetch(
      `${bffUrl()}/images/${encodeURIComponent(id)}`,
      { cache: 'no-store' },
    );
    if (!upstream.ok) {
      return new Response('Not found', { status: upstream.status });
    }
    return new Response(await upstream.arrayBuffer(), {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not reachable', { status: 502 });
  }
}
