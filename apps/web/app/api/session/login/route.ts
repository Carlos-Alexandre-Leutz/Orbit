import { startSession } from '@/lib/session-routes';

export async function POST(request: Request) {
  return startSession('/auth/login', request);
}
