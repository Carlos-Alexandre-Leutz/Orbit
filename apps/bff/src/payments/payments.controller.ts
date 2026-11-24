import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Param,
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

  @Post('webhook/:slug')
  @HttpCode(200)
  @ApiOperation({
    summary:
      "A store's own payment provider webhook (called by the provider, not by the site)",
  })
  storeWebhook(
    @Param('slug') slug: string,
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') stripeSignature?: string,
    @Headers('x-signature') mercadoPagoSignature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }
    return callStoreApi(
      this.http,
      'post',
      `/payments/webhook/${encodeURIComponent(slug)}`,
      {
        body: request.rawBody,
        // The query holds the payment id that Mercado Pago signs, so it goes along unchanged.
        query: request.query as Record<string, unknown>,
        headers: {
          'Content-Type': 'application/json',
          ...(stripeSignature ? { 'stripe-signature': stripeSignature } : {}),
          ...(mercadoPagoSignature
            ? { 'x-signature': mercadoPagoSignature }
            : {}),
          ...(requestId ? { 'x-request-id': requestId } : {}),
        },
        fallback: 'Erro ao receber o evento de pagamento',
      },
    );
  }
}
