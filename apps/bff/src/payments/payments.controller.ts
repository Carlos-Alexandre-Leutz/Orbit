import {
  BadRequestException,
  Controller,
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

/** Where the payment provider sends its events. No session: the store API checks the signature. */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly http: HttpService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Payment provider webhook (called by the provider, not by the site)',
  })
  webhook(
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }
    return callStoreApi(this.http, 'post', '/payments/webhook', {
      body: request.rawBody,
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'stripe-signature': signature } : {}),
      },
      fallback: 'Erro ao receber o evento de pagamento',
    });
  }
}
