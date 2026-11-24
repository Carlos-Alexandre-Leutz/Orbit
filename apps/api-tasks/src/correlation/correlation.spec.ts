import { of, throwError } from 'rxjs';
import {
  acceptCorrelationId,
  correlationHeaders,
  correlationMetadata,
  currentCorrelationId,
  recordStep,
  runWithCorrelation,
} from './correlation';
import { ExecutionTrace, TraceStore } from './trace-store';
import { TracingInterceptor } from './tracing.interceptor';
import { createTraceStore } from './correlation.module';
import { NoopTraceStore } from './trace-store';

describe('correlation ID', () => {
  it('keeps a plain token and replaces anything else', () => {
    expect(acceptCorrelationId('abc-123_DEF.45')).toBe('abc-123_DEF.45');
    for (const bad of [
      undefined,
      '',
      'short',
      'a b c d e f g h',
      'x'.repeat(65),
      'a\nb-12345678',
    ]) {
      expect(acceptCorrelationId(bad)).toMatch(/^[0-9a-f-]{36}$/);
    }
    expect(acceptCorrelationId(['req-12345678', 'other'])).toBe('req-12345678');
  });

  it('is available inside the request and gives headers and metadata', () => {
    expect(currentCorrelationId()).toBeUndefined();
    expect(correlationHeaders()).toEqual({});
    expect(correlationMetadata()).toEqual({});
    runWithCorrelation('req-12345678', () => {
      expect(correlationHeaders()).toEqual({
        'X-Correlation-Id': 'req-12345678',
      });
      expect(correlationMetadata()).toEqual({ correlationId: 'req-12345678' });
    });
  });

  it('uses a no-op store when MONGO_URL is not set', () => {
    expect(createTraceStore({})).toBeInstanceOf(NoopTraceStore);
  });
});

describe('TracingInterceptor', () => {
  function setup() {
    const saved: ExecutionTrace[] = [];
    const store = {
      save: (t: ExecutionTrace) => (saved.push(t), Promise.resolve()),
    };
    const interceptor = new TracingInterceptor(store as TraceStore);
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          path: '/cart/items',
          route: { path: '/cart/items' },
          user: { id: 'u1' },
        }),
        getResponse: () => ({ statusCode: 201 }),
      }),
    };
    return { saved, interceptor, context: context as never };
  }

  it('saves one trace with the steps of the request', async () => {
    const { saved, interceptor, context } = setup();
    await runWithCorrelation('req-12345678', () => {
      recordStep('tool.add_item', { sku: 'A1' });
      return new Promise<void>((resolve) =>
        interceptor
          .intercept(context, { handle: () => of('ok') })
          .subscribe({ complete: resolve }),
      );
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      correlationId: 'req-12345678',
      method: 'POST',
      route: '/cart/items',
      status: 201,
      actorId: 'u1',
    });
    expect(saved[0].steps.map((s) => s.name)).toEqual(['tool.add_item']);
  });

  it('saves the failure too, with its status and name', async () => {
    const { saved, interceptor, context } = setup();
    await runWithCorrelation(
      'req-12345678',
      () =>
        new Promise<void>((resolve) =>
          interceptor
            .intercept(context, {
              handle: () =>
                throwError(() => ({ status: 409, name: 'ConflictException' })),
            })
            .subscribe({ error: () => resolve() }),
        ),
    );
    expect(saved[0]).toMatchObject({ status: 409, error: 'ConflictException' });
  });

  it('does nothing outside a request that has an ID', () => {
    const { saved, interceptor, context } = setup();
    interceptor.intercept(context, { handle: () => of('ok') }).subscribe();
    expect(saved).toHaveLength(0);
  });
});
