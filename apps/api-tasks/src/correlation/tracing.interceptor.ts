import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { currentCorrelationId, currentSteps } from './correlation';
import { ExecutionTrace, TraceStore } from './trace-store';

/** Saves one trace per HTTP request, after the answer is ready. The save is not awaited. */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly store: TraceStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const correlationId = currentCorrelationId();
    if (!correlationId) return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest<Partial<AuthenticatedRequest>>();
    const response = http.getResponse<Response>();
    const startedAt = new Date();

    const finish = (status: number, error?: string) => {
      const route =
        (request.route as { path?: string } | undefined)?.path ??
        (request.path ?? '').split('?')[0];
      const trace: ExecutionTrace = {
        correlationId,
        method: request.method ?? '',
        route,
        status,
        durationMs: Date.now() - startedAt.getTime(),
        startedAt,
        actorId: request.user?.id,
        error,
        steps: [...currentSteps()],
      };
      void this.store.save(trace);
    };

    return next.handle().pipe(
      tap({
        next: () => finish(response.statusCode),
        error: (error: { status?: number; name?: string }) =>
          finish(error.status ?? 500, error.name ?? 'Error'),
      }),
    );
  }
}
