import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { callStoreApi } from '../upstream';

export class StoreDto {
  @ApiProperty({
    example: 'loja-do-joao',
    description: 'The link of the store',
  })
  slug: string;

  @ApiProperty({ example: 'Loja do João' })
  name: string;

  @ApiProperty()
  description: string;
}

export class StoreChatBody {
  @ApiProperty({
    format: 'uuid',
    description: 'Made by the browser; it only groups the limits',
  })
  visitorId: string;

  @ApiProperty({ maxLength: 1000 })
  message: string;

  @ApiProperty({
    required: false,
    description: 'The last messages of the conversation, kept by the page',
    example: [{ role: 'user', content: 'Do you have mugs?' }],
  })
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export class ConnectPaymentBody {
  @ApiProperty({ example: 'stripe', enum: ['stripe', 'mercadopago'] })
  provider: string;

  @ApiProperty({ description: 'Secret key or access token (stored encrypted)' })
  secretKey: string;

  @ApiProperty({ description: 'Public key, used by the browser' })
  publicKey: string;

  @ApiProperty({ description: 'Webhook signing secret (stored encrypted)' })
  webhookSecret: string;
}

export class UpdateStoreBody {
  @ApiProperty({ required: false, example: 'Loja do João' })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, example: 'Handmade mugs' })
  tagline?: string;

  @ApiProperty({ required: false, example: '#2563eb' })
  primaryColor?: string;

  @ApiProperty({ required: false })
  contactEmail?: string;

  @ApiProperty({ required: false })
  contactPhone?: string;

  @ApiProperty({ required: false, nullable: true, format: 'uuid' })
  logoImageId?: string | null;

  @ApiProperty({ required: false, type: [String], maxItems: 5 })
  bannerImageIds?: string[];
}

/** A store is public at its link; there is no list of stores, so a buyer needs the link. */
@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly http: HttpService) {}

  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My own store (seller only)' })
  mine(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/stores/mine', {
      authorization,
      fallback: 'Could not load your store',
    });
  }

  @Patch('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit the name and description of my store' })
  update(
    @Body() body: UpdateStoreBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'patch', '/stores/mine', {
      authorization,
      body,
      fallback: 'Could not save your store',
    });
  }

  @Put('mine/payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect my own payment provider (seller only)' })
  connectPayments(
    @Body() body: ConnectPaymentBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'put', '/stores/mine/payments', {
      authorization,
      body,
      fallback: 'Could not connect the payment provider',
    });
  }

  @Delete('mine/payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect my payment provider (seller only)' })
  disconnectPayments(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'delete', '/stores/mine/payments', {
      authorization,
      fallback: 'Could not disconnect the payment provider',
    });
  }

  @Get('mine/sales')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sales of my store over the last 1 to 90 days (seller only)',
  })
  sales(
    @Query('days') days?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'get', '/stores/mine/sales', {
      authorization,
      query: { days },
      fallback: 'Could not load the sales',
    });
  }

  @Get('mine/stock')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stock of my products, lowest first (seller only)' })
  stock(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/stores/mine/stock', {
      authorization,
      fallback: 'Could not load the stock',
    });
  }

  @Get('mine/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Numbers for the start page of the panel' })
  summary(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/stores/mine/summary', {
      authorization,
      fallback: 'Could not load the summary',
    });
  }

  @Get(':slug/categories')
  @ApiOperation({
    summary: 'The categories with products on sale in the store',
  })
  categories(@Param('slug') slug: string) {
    return callStoreApi(
      this.http,
      'get',
      `/stores/${encodeURIComponent(slug)}/categories`,
      { fallback: 'Could not load the categories' },
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Read the store at a link' })
  @ApiResponse({ status: 200, type: StoreDto })
  @ApiResponse({ status: 404, description: 'No store has this link' })
  one(@Param('slug') slug: string) {
    return callStoreApi(
      this.http,
      'get',
      `/stores/${encodeURIComponent(slug)}`,
      {
        fallback: 'Erro ao carregar a loja',
      },
    );
  }

  @Post(':slug/chat')
  @ApiOperation({
    summary:
      "Ask the store's assistant about its products, prices and delivery",
  })
  @ApiResponse({ status: 201, description: 'The answer and its status' })
  @ApiResponse({ status: 404, description: 'No open store has this link' })
  @ApiResponse({ status: 429, description: 'Too many questions' })
  chat(@Param('slug') slug: string, @Body() body: StoreChatBody) {
    return callStoreApi(
      this.http,
      'post',
      `/stores/${encodeURIComponent(slug)}/chat`,
      { body, fallback: 'The assistant is unavailable' },
    );
  }
}
