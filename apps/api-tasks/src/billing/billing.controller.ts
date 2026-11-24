import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { InvalidSignatureError } from '../payments/payment-provider';
import { BillingService } from './billing.service';
import { StartBillingDto } from './start-billing.dto';

/** What a seller pays Orbit for the platform. Not to be mixed with `payments`, which is what customers pay a store. */
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('mine')
  @Auth('SELLER')
  mine(@Req() request: AuthenticatedRequest) {
    return this.billing.statusOf(request.user.id);
  }

  @Post('start')
  @Auth('SELLER')
  start(@Req() request: AuthenticatedRequest, @Body() body: StartBillingDto) {
    return this.billing.start(request.user.id, body.cardToken, body.payerEmail);
  }

  /** Mercado Pago calls this, not a person: no session, the signature on the notification is the proof. */
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Query() query: Record<string, string | undefined>,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    if (!request.rawBody) throw new BadRequestException('Missing request body');
    try {
      await this.billing.handleWebhook(
        request.rawBody,
        signature,
        requestId,
        query,
      );
    } catch (error) {
      if (error instanceof InvalidSignatureError) {
        throw new BadRequestException('Invalid signature');
      }
      throw error;
    }
    return { received: true };
  }
}
