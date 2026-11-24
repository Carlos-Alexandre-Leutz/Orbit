import { Global, Logger, Module } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import {
  ConversationMemory,
  MEMORY_CONFIG,
  MemoryConfig,
} from './conversation-memory';
import { ConversationStore } from './conversation-store';
import { ConversationsController } from './conversations.controller';
import { InMemoryConversationStore } from './in-memory-conversation-store';
import { MongoConversationStore } from './mongo-conversation-store';

/** MongoDB when `MONGO_URL` is set; otherwise the process memory, which a restart empties. */
export function createConversationStore(
  env: NodeJS.ProcessEnv = process.env,
): ConversationStore {
  const url = env.MONGO_URL?.trim();
  if (!url) {
    new Logger('Memory').warn(
      'MONGO_URL is not set: conversations are kept in memory and lost on restart',
    );
    return new InMemoryConversationStore();
  }
  const days = Number(env.CONVERSATION_TTL_DAYS);
  return new MongoConversationStore(
    url,
    Number.isFinite(days) && days > 0 ? days : 30,
  );
}

@Global()
@Module({
  controllers: [ConversationsController],
  providers: [
    { provide: ConversationStore, useFactory: () => createConversationStore() },
    {
      provide: MEMORY_CONFIG,
      useFactory: (): MemoryConfig => ({
        keepMessages: Number(process.env.MEMORY_KEEP_MESSAGES) || 8,
        summarizeAbove: Number(process.env.MEMORY_SUMMARIZE_ABOVE) || 20,
        hardCap: 60,
      }),
    },
    {
      provide: ConversationMemory,
      inject: [ConversationStore, LlmService, MEMORY_CONFIG],
      useFactory: (
        store: ConversationStore,
        llm: LlmService,
        config: MemoryConfig,
      ) => new ConversationMemory(store, llm, config),
    },
  ],
  exports: [ConversationMemory],
})
export class MemoryModule {}
