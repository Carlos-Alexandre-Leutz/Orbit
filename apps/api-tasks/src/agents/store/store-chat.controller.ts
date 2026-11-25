import { Body, Controller, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { StoreChatService } from './store-chat.service';

class HistoryMessage {
  @IsIn(['user', 'assistant']) role: 'user' | 'assistant';
  @IsString() @MaxLength(2000) content: string;
}

export class StoreChatDto {
  /** Made by the visitor's browser; it only groups the limits, it proves nothing. */
  @IsUUID() visitorId: string;
  @IsString() @MinLength(1) @MaxLength(1000) message: string;
  /** The last messages of this conversation, kept by the page. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => HistoryMessage)
  history?: HistoryMessage[];
}

/** Public on purpose, like the storefront: it only answers from what the store already shows. */
@Controller('stores')
export class StoreChatController {
  constructor(private readonly chat: StoreChatService) {}

  @Post(':slug/chat')
  ask(@Param('slug') slug: string, @Body() dto: StoreChatDto) {
    return this.chat.ask(slug, dto);
  }
}
