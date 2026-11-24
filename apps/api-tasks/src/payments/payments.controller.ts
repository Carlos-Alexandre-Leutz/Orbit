import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { InvalidSignatureError } from './payment-provider';
import { PaymentsService } from './payments.service';

/** The provider calls this, not a person: there is no session, the signature on the raw body is the proof. */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.receive(request, signature);
  }

  /** A store's own webhook: its seller points their provider here, and the store's secret checks it. */
  @Post('webhook/:slug')
  @HttpCode(200)
  async storeWebhook(
    @Param('slug') slug: string,
    @Req() request: RawBodyRequest<Request>,
    @Query() query: Record<string, string | undefined>,
    @Headers('stripe-signature') stripeSignature?: string,
    @Headers('x-signature') mercadoPagoSignature?: string,
  ) {
    return this.receive(
      request,
      stripeSignature ?? mercadoPagoSignature,
      slug,
      query,
    );
  }

  private async receive(
    request: RawBodyRequest<Request>,
    signature: string | undefined,
    slug?: string,
    query: Record<string, string | undefined> = {},
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }
    const headers: Record<string, string | undefined> = {};
    for (const [name, value] of Object.entries(request.headers)) {
      headers[name] = Array.isArray(value) ? value[0] : value;
    }
    try {
      await this.payments.handleEvent(request.rawBody, signature, slug, {
        headers,
        query,
      });
    } catch (error) {
      if (error instanceof InvalidSignatureError) {
        throw new BadRequestException('Invalid signature');
      }
      throw error;
    }
    return { received: true };
  }
}
