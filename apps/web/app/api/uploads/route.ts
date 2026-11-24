import { NextResponse } from 'next/server';
import { sessionToken } from '@/lib/auth';
import { bffUrl } from '@/lib/config';

/** A seller's upload: the file goes to the BFF as it is, with the session token added here. */
export async function POST(request: Request) {
  const token = await sessionToken();
  if (!token) {
    return NextResponse.json({ message: 'Sign in first' }, { status: 401 });
  }
  const type = request.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) {
    return NextResponse.json(
      { message: 'Only PNG, JPEG or WebP pictures are accepted' },
      { status: 400 },
    );
  }
  try {
    const upstream = await fetch(`${bffUrl()}/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': type, Authorization: `Bearer ${token}` },
      body: await request.arrayBuffer(),
      cache: 'no-store',
    });
    const data: unknown = await upstream.json().catch(() => null);
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: 'The server is not reachable. Try again.' },
      { status: 502 },
    );
  }
}
