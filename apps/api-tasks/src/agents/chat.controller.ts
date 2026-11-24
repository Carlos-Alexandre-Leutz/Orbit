import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { AgentEvent } from './agent';
import { Orchestrator } from './orchestrator';

class TurnDto {
  @IsIn(['user', 'assistant']) role: 'user' | 'assistant';
  @IsString() @MaxLength(2000) content: string;
}

export class ChatDto {
  @IsString() @MinLength(1) @MaxLength(2000) message: string;
  /** Earlier turns, kept by the page until the server keeps them (PBI-21). */
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  history: TurnDto[] = [];
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
  constructor(private readonly orchestrator: Orchestrator) {}

  @Post('stream')
  async stream(
    @Body() dto: ChatDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    response.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();
    try {
      await this.orchestrator.handle({
        actor: { id: request.user.id, role: request.user.role },
        message: dto.message,
        history: dto.history,
        emit: (event) => response.write(formatEvent(event)),
      });
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
