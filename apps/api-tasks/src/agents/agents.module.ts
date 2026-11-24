import { Module } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { ToolExecutor } from '../tools/tool-executor';
import { ToolRegistry } from '../tools/tool-registry';
import { AgentLoop, AGENT_LIMITS } from './agent-loop';
import { AgentLimits } from './agent';
import { ChatController } from './chat.controller';
import { Orchestrator } from './orchestrator';

@Module({
  controllers: [ChatController],
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
    Orchestrator,
  ],
  exports: [Orchestrator],
})
export class AgentsModule {}
