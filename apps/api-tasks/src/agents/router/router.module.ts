import { Global, Module } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { LlmService } from '../../llm/llm.service';
import { IntentRouter, ROUTER_CONFIG, RouterConfig } from './intent-router';

/** The router is not called by an agent now (the store chat has one agent); the seller agent (PBI-32) will use it. */
@Global()
@Module({
  providers: [
    {
      provide: ROUTER_CONFIG,
      useFactory: (): RouterConfig => ({
        minConfidence: Number(process.env.ROUTER_MIN_CONFIDENCE) || 0.7,
        clarifyConfidence: Number(process.env.ROUTER_CLARIFY_CONFIDENCE) || 0.4,
        models: (process.env.ROUTER_MODELS ?? '')
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
      }),
    },
    {
      provide: IntentRouter,
      inject: [LlmService, AuditService, ROUTER_CONFIG],
      useFactory: (
        llm: LlmService,
        audit: AuditService,
        config: RouterConfig,
      ) => new IntentRouter(llm, audit, config),
    },
  ],
  exports: [IntentRouter],
})
export class RouterModule {}
