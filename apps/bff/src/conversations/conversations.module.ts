import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConversationsController } from './conversations.controller';

@Module({ imports: [HttpModule], controllers: [ConversationsController] })
export class ConversationsModule {}
