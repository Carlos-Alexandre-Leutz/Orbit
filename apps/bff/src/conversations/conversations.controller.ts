import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { callStoreApi } from '../upstream';

/** The chats of the signed-in user, kept by the store API. */
@ApiTags('chat')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'My conversations' })
  list(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/conversations', {
      authorization,
      fallback: 'Could not load the conversations',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'One of my conversations, with its messages' })
  get(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'get',
      `/conversations/${encodeURIComponent(id)}`,
      {
        authorization,
        fallback: 'Could not load the conversation',
      },
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete one of my conversations' })
  async remove(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await callStoreApi(
      this.http,
      'delete',
      `/conversations/${encodeURIComponent(id)}`,
      {
        authorization,
        fallback: 'Could not delete the conversation',
      },
    );
  }
}
