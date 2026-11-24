import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { ConversationMemory } from './conversation-memory';

/** The chats of the signed-in user. Another user's id answers 404, as if it did not exist. */
@Controller('conversations')
@Auth('CUSTOMER', 'SELLER')
export class ConversationsController {
  constructor(private readonly memory: ConversationMemory) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.memory.list(request.user.id).then((items) =>
      items.map(({ id, updatedAt, createdAt }) => ({
        id,
        createdAt,
        updatedAt,
      })),
    );
  }

  @Get(':id')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const conversation = await this.memory.get(request.user.id, id);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return {
      id: conversation.id,
      summary: conversation.summary,
      messages: conversation.messages,
      updatedAt: conversation.updatedAt,
    };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!(await this.memory.remove(request.user.id, id))) {
      throw new NotFoundException('Conversation not found');
    }
  }
}
