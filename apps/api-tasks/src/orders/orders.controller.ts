import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { OrdersService } from './orders.service';

/** The orders of the logged-in user. Shipping and delivering belong to sellers and admins. */
@Controller('orders')
@Auth()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

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
