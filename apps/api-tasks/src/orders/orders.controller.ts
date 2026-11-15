import {
  Body,
  Controller,
  Get,
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

/** The orders of the logged-in user. Shipping and delivering belong to sellers and admins. */
@Controller('orders')
@Auth()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
  ) {}

  @Post()
  place(@Req() request: AuthenticatedRequest) {
    return this.orders.createFromCart(request.user.id);
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
