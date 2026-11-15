import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
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
    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }
    try {
      await this.payments.handleEvent(request.rawBody, signature);
    } catch (error) {
      if (error instanceof InvalidSignatureError) {
        throw new BadRequestException('Invalid signature');
      }
      throw error;
    }
    return { received: true };
  }
}
