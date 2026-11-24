import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export const CORRELATION_HEADER = 'x-correlation-id';

const storage = new AsyncLocalStorage<string>();

/**
 * Keeps an ID sent by the caller only when it is a plain token (letters, digits, dot, dash, underscore, 8 to
 * 64 characters); anything else could forge log lines, so a new ID replaces it. Same rule as the store API.
 */
export function acceptCorrelationId(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === 'string' && /^[A-Za-z0-9._-]{8,64}$/.test(value)) {
    return value;
  }
  return randomUUID();
}

export function runWithCorrelation<T>(id: string, work: () => T): T {
  return storage.run(id, work);
}

export function currentCorrelationId(): string | undefined {
  return storage.getStore();
}

/** Gives every request an ID, answers with it and keeps it for the calls the request makes to the store API. */
export function registerCorrelation(fastify: {
  addHook(
    name: 'onRequest',
    hook: (
      request: { headers: Record<string, unknown> },
      reply: { header(name: string, value: string): unknown },
      done: () => void,
    ) => void,
  ): unknown;
}) {
  fastify.addHook('onRequest', (request, reply, done) => {
    const id = acceptCorrelationId(request.headers[CORRELATION_HEADER]);
    reply.header('X-Correlation-Id', id);
    runWithCorrelation(id, done);
  });
}
