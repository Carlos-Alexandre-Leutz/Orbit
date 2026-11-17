import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { callStoreApi } from '../upstream';

/** What a seller pays Orbit for the platform (the monthly plan, with 30 free days). */
@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly http: HttpService) {}

  @Get('mine')
  @ApiOperation({ summary: 'The subscription of my store (seller only)' })
  mine(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/billing/mine', {
      authorization,
      fallback: 'Could not load the billing status',
    });
  }

  @Post('start')
  @ApiOperation({
    summary:
      'Start the subscription; gives the page where the card is registered (seller only)',
  })
  start(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'post', '/billing/start', {
      authorization,
      body: {},
      fallback: 'Could not start the subscription',
    });
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Billing provider notification (called by the provider)',
  })
  webhook(
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }
    return callStoreApi(this.http, 'post', '/billing/webhook', {
      body: request.rawBody,
      // The query holds the id that Mercado Pago signs, so it goes along unchanged.
      query: request.query as Record<string, unknown>,
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'x-signature': signature } : {}),
        ...(requestId ? { 'x-request-id': requestId } : {}),
      },
      fallback: 'Erro ao receber o aviso de cobrança',
    });
  }
}
