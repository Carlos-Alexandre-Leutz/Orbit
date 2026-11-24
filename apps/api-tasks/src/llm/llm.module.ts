import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InMemoryLlmCache, LlmCache } from './llm-cache';
import { createLlmProvider, llmModels } from './llm-provider.factory';
import { priceTable } from './llm-pricing';
import { LlmProvider } from './llm-provider';
import { LLM_CONFIG, LlmGatewayConfig, LlmService } from './llm.service';

@Global()
@Module({
  providers: [
    { provide: LlmProvider, useFactory: () => createLlmProvider() },
    { provide: LlmCache, useFactory: () => new InMemoryLlmCache() },
    {
      provide: LLM_CONFIG,
      useFactory: (): LlmGatewayConfig => ({
        models: llmModels(),
        prices: priceTable(),
        timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 30_000,
        maxAttempts: 2,
        retryDelayMs: 500,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      }),
    },
    {
      provide: LlmService,
      inject: [LlmProvider, LlmCache, PrismaService, LLM_CONFIG],
      useFactory: (
        provider: LlmProvider,
        cache: LlmCache,
        prisma: PrismaService,
        config: LlmGatewayConfig,
      ) => new LlmService(provider, cache, prisma, config),
    },
  ],
  exports: [LlmService],
})
export class LlmModule {}
