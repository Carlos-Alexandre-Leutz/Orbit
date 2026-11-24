import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Logger,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { AgentEvent } from './agent';
import { ConversationMemory } from '../memory/conversation-memory';
import { Orchestrator } from './orchestrator';

export class ChatDto {
  @IsString() @MinLength(1) @MaxLength(2000) message: string;
  /** Continues a conversation of this user. Leave out to start a new one: its id comes back in the first event. */
  @IsOptional() @IsUUID() conversationId?: string;
}

/** One server-sent event: `event: <type>` and the JSON of the event. */
export function formatEvent(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * The chat endpoint. It answers as a stream of server-sent events (status, tool calls, the message, done),
 * so the page can show progress. The text of the answer arrives whole in one `message` event: the model
 * provider is called without token streaming for now.
 */
@Controller('chat')
@Auth('CUSTOMER', 'SELLER')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly orchestrator: Orchestrator,
    private readonly memory: ConversationMemory,
  ) {}

  @Post('stream')
  async stream(
    @Body() dto: ChatDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const userId = request.user.id;
    // Continuing a chat needs one that exists and is this user's; anyone else's looks missing.
    if (
      dto.conversationId &&
      !(await this.memory.get(userId, dto.conversationId))
    ) {
      throw new NotFoundException('Conversation not found');
    }
    const conversationId = dto.conversationId ?? randomUUID();
    const context = await this.memory.contextFor(userId, conversationId);
    response.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();
    response.write(formatEvent({ type: 'conversation', id: conversationId }));
    try {
      const result = await this.orchestrator.handle({
        actor: { id: userId, role: request.user.role },
        message: dto.message,
        history: context.history,
        summary: context.summary,
        emit: (event) => response.write(formatEvent(event)),
      });
      await this.memory
        .remember(userId, conversationId, dto.message, result.message)
        .catch((error: Error) =>
          this.logger.warn(`Could not remember the chat: ${error.message}`),
        );
    } catch {
      response.write(
        formatEvent({
          type: 'message',
          text: 'Something went wrong. Please try again.',
        }),
      );
      response.write(
        formatEvent({
          type: 'done',
          status: 'failed',
          steps: 0,
          costMicroUsd: 0,
        }),
      );
    }
    response.end();
  }
}
