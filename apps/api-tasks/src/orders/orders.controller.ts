import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { StoresService } from '../stores/stores.service';
import { PayOrderDto } from './dto/pay-order.dto';
import { OrdersService, Viewer } from './orders.service';
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

/**
 * The orders of the logged-in user. Shipping and delivering belong to the seller of the order's store, and
 * to admins. A seller's store is found from the session, never from the request.
 */
@Controller('orders')
@Auth()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
    private readonly stores: StoresService,
  ) {}

  /** Who is asking, with the store a seller owns. */
  private async viewer(request: AuthenticatedRequest): Promise<Viewer> {
    const { id, role } = request.user;
    if (role !== 'SELLER') {
      return { id, role };
    }
    // A seller who has not named a store yet is only a buyer here.
    const store = await this.stores.findOfSeller(id);
    return store ? { id, role, storeId: store.id } : { id, role };
  }

  /** Places an order from my cart in one store, named by its link in `?store=`. Any account buys, a seller included, except admins. */
  @Post()
  @Auth('CUSTOMER', 'SELLER')
  async place(
    @Req() request: AuthenticatedRequest,
    @Query('store') store?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!store) {
      throw new BadRequestException('The store link is required (?store=)');
    }
    return this.orders.createFromCart(
      request.user.id,
      (await this.stores.bySlug(store)).id,
      parseIdempotencyKey(idempotencyKey),
    );
  }

  /** My orders; `?store=<link>` keeps only the ones of that store. */
  @Get()
  async mine(
    @Req() request: AuthenticatedRequest,
    @Query('store') store?: string,
  ) {
    const storeId = store ? (await this.stores.bySlug(store)).id : undefined;
    return this.orders.listMine(request.user.id, storeId);
  }

  /** The orders of the seller's own store; the store comes from the session. */
  @Get('store')
  @Auth('SELLER')
  async ofStore(@Req() request: AuthenticatedRequest) {
    return this.orders.listForStore(
      (await this.stores.ofSeller(request.user.id)).id,
    );
  }

  @Get(':id')
  async one(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.get(id, await this.viewer(request));
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
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.cancel(id, await this.viewer(request));
  }

  @Post(':id/ship')
  @Auth('SELLER', 'ADMIN')
  async ship(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.transition(id, 'SHIPPED', await this.viewer(request));
  }

  @Post(':id/deliver')
  @Auth('SELLER', 'ADMIN')
  async deliver(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.transition(id, 'DELIVERED', await this.viewer(request));
  }
}
