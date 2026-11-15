import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { PayOrderDto } from './dto/pay-order.dto';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../payments/payments.service';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;

/** The key is optional; when sent it must look like a random id, so it is safe to store and index. */
function parseIdempotencyKey(value?: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!IDEMPOTENCY_KEY.test(value)) {
    throw new BadRequestException(
      'Idempotency-Key must be 8 to 128 letters, digits, "-" or "_"',
    );
  }
  return value;
}

/** The orders of the logged-in user. Shipping and delivering belong to sellers and admins. */
@Controller('orders')
@Auth()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
  ) {}

  @Post()
  place(
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.orders.createFromCart(
      request.user.id,
      parseIdempotencyKey(idempotencyKey),
    );
  }

  @Get()
  mine(@Req() request: AuthenticatedRequest) {
    return this.orders.listMine(request.user.id);
  }

  @Get(':id')
  one(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.get(id, request.user);
  }

  /** Pays one of my orders. Paying a paid order is harmless: it returns the order again. */
  @Post(':id/pay')
  pay(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PayOrderDto,
  ) {
    return this.payments.pay(id, request.user.id, body.paymentMethod);
  }

  /** Cancels an order: the owner while it waits for payment, a seller or admin also after it was paid. */
  @Post(':id/cancel')
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.cancel(id, request.user);
  }

  @Post(':id/ship')
  @Auth('SELLER', 'ADMIN')
  ship(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.transition(id, 'SHIPPED');
  }

  @Post(':id/deliver')
  @Auth('SELLER', 'ADMIN')
  deliver(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.transition(id, 'DELIVERED');
  }
}
