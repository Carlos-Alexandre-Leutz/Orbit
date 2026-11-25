import { Module } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { StoresModule } from '../stores/stores.module';
import { ToolExecutor } from '../tools/tool-executor';
import { ToolRegistry } from '../tools/tool-registry';
import { AgentLoop, AGENT_LIMITS } from './agent-loop';
import { AgentLimits } from './agent';
import { StoreChatController } from './store/store-chat.controller';
import { StoreChatService } from './store/store-chat.service';

@Module({
  imports: [StoresModule],
  controllers: [StoreChatController],
  providers: [
    {
      provide: AGENT_LIMITS,
      useFactory: (): AgentLimits => ({
        maxSteps: Number(process.env.AGENT_MAX_STEPS) || 6,
        maxCostMicroUsd: Number(process.env.AGENT_MAX_COST_MICRO_USD) || 50_000,
      }),
    },
    {
      provide: AgentLoop,
      inject: [LlmService, ToolExecutor, ToolRegistry, AGENT_LIMITS],
      useFactory: (
        llm: LlmService,
        executor: ToolExecutor,
        registry: ToolRegistry,
        limits: AgentLimits,
      ) => new AgentLoop(llm, executor, registry, limits),
    },
    StoreChatService,
  ],
})
export class AgentsModule {}
