import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import type { OutgoingHttpHeaders } from 'node:http';
import type { FastifyReply } from 'fastify';
import { currentCorrelationId } from '../correlation';

export class ChatBody {
  @ApiProperty({ maxLength: 2000 }) message: string;
  @ApiProperty({
    required: false,
    format: 'uuid',
    description:
      'Continues a conversation; leave out to start one (its id is in the first event)',
  })
  conversationId?: string;
}

/**
 * The chat of the store assistant. The answer is a stream of server-sent events (status, tool_call,
 * tool_result, approval_required, message, done), passed on as they arrive so the page can show progress.
 */
@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  @Post('stream')
  @ApiOperation({
    summary: 'Ask the assistant; the answer streams as server-sent events',
  })
  async stream(
    @Body() body: ChatBody,
    @Res() reply: FastifyReply,
    @Headers('authorization') authorization?: string,
  ) {
    const correlationId = currentCorrelationId();
    let upstream: Response;
    try {
      upstream = await fetch(`${process.env.TASKS_API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {}),
          ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new HttpException(
        'The assistant is unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!upstream.ok || !upstream.body) {
      const error = (await upstream.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      const message = Array.isArray(error.message)
        ? error.message.join('; ')
        : error.message;
      throw new HttpException(
        message ?? 'The assistant is unavailable',
        upstream.status || HttpStatus.BAD_GATEWAY,
      );
    }
    // Take the answer over from Fastify, keeping the headers it already set (CORS, correlation ID).
    reply.hijack();
    reply.raw.writeHead(200, {
      ...(reply.getHeaders() as OutgoingHttpHeaders),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    });
    try {
      for await (const chunk of upstream.body as unknown as AsyncIterable<Uint8Array>) {
        reply.raw.write(chunk);
      }
    } finally {
      reply.raw.end();
    }
  }
}
