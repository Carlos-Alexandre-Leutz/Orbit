import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

/** One step recorded inside a request, such as a tool call or a model call. */
export interface TraceStep {
  name: string;
  at: Date;
  data?: Record<string, unknown>;
}

interface CorrelationContext {
  correlationId: string;
  steps: TraceStep[];
}

const storage = new AsyncLocalStorage<CorrelationContext>();

/**
 * A caller may bring its own ID so one action can be followed across services, but only a plain token is
 * kept: anything else (spaces, line breaks, very long text) could forge log lines, so a new ID replaces it.
 */
export function acceptCorrelationId(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === 'string' && /^[A-Za-z0-9._-]{8,64}$/.test(value)) {
    return value;
  }
  return randomUUID();
}

export function runWithCorrelation<T>(correlationId: string, work: () => T): T {
  return storage.run({ correlationId, steps: [] }, work);
}

/** The ID of the request being served, or undefined outside one (a job, a test). */
export function currentCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

/** The steps recorded so far in the current request. */
export function currentSteps(): TraceStep[] {
  return storage.getStore()?.steps ?? [];
}

/** Records a step in the current request; does nothing outside one. */
export function recordStep(name: string, data?: Record<string, unknown>) {
  storage.getStore()?.steps.push({ name, at: new Date(), data });
}

/** Headers to add to a call to another service so it joins the same trail. */
export function correlationHeaders(): Record<string, string> {
  const id = currentCorrelationId();
  return id ? { 'X-Correlation-Id': id } : {};
}

/** For a provider that keeps free-form metadata on a payment (Stripe, Mercado Pago). */
export function correlationMetadata(): Record<string, string> {
  const id = currentCorrelationId();
  return id ? { correlationId: id } : {};
}

/** Gives every request an ID, answers with it in `X-Correlation-Id` and keeps it for everything the request calls. */
export function correlationMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const id = acceptCorrelationId(request.headers[CORRELATION_HEADER]);
  response.setHeader('X-Correlation-Id', id);
  runWithCorrelation(id, next);
}
