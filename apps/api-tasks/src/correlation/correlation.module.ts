import {
  Global,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { correlationMiddleware } from './correlation';
import { MongoTraceStore, NoopTraceStore, TraceStore } from './trace-store';
import { TracingInterceptor } from './tracing.interceptor';

/** `MONGO_URL` turns tracing on; without it the correlation ID still flows, only the traces are dropped. */
export function createTraceStore(env: NodeJS.ProcessEnv = process.env) {
  const url = env.MONGO_URL?.trim();
  if (!url) {
    new Logger('Tracing').warn('MONGO_URL is not set: traces are not saved');
    return new NoopTraceStore();
  }
  const days = Number(env.TRACE_TTL_DAYS);
  return new MongoTraceStore(
    url,
    Number.isFinite(days) && days > 0 ? days : 30,
  );
}

@Global()
@Module({
  providers: [
    { provide: TraceStore, useFactory: () => createTraceStore() },
    { provide: APP_INTERCEPTOR, useClass: TracingInterceptor },
  ],
  exports: [TraceStore],
})
export class CorrelationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(correlationMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
