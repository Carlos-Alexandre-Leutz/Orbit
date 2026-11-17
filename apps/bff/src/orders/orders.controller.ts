import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { callStoreApi } from '../upstream';

export class OrderLineDto {
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() sku: string;
  @ApiProperty() name: string;
  @ApiProperty({ description: 'Price in cents at the moment of the purchase' })
  priceCents: number;
  @ApiProperty() quantity: number;
  @ApiProperty() lineTotalCents: number;
}

export class OrderDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: { slug: 'loja', name: 'Loja' } })
  store: { slug: string; name: string };
  @ApiProperty({
    enum: ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  })
  status: string;
  @ApiProperty({ example: 'USD' }) currency: string;
  @ApiProperty({ description: 'Total in cents, shipping included' })
  totalCents: number;
  @ApiProperty({ description: 'The shipping part of the total, in cents' })
  shippingCents: number;
  @ApiProperty({ enum: ['SHIPPING', 'PICKUP'] }) deliveryMethod: string;
  @ApiProperty({
    nullable: true,
    description: 'Where a shipped order goes; null for a pickup',
  })
  shippingAddress: Record<string, string | null> | null;
  @ApiProperty({ nullable: true }) trackingCode: string | null;
  @ApiProperty({ nullable: true, description: 'Link to the tax invoice' })
  invoiceUrl: string | null;
  @ApiProperty({ nullable: true, description: 'Earliest delivery date' })
  estimatedFrom: string | null;
  @ApiProperty({ nullable: true, description: 'Latest delivery date' })
  estimatedTo: string | null;
  @ApiProperty({ type: [OrderLineDto] }) items: OrderLineDto[];
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true }) paidAt: string | null;
  @ApiProperty({ nullable: true }) shippedAt: string | null;
  @ApiProperty({ nullable: true }) deliveredAt: string | null;
  @ApiProperty({ nullable: true }) cancelledAt: string | null;
  @ApiProperty({ description: 'A cancelled paid order was refunded' })
  refunded: boolean;
}

export class PayOrderDto {
  @ApiProperty({
    required: false,
    example: 'pm_card_visa',
    description:
      'A test payment method. pm_card_chargeDeclined is declined; the default succeeds.',
  })
  paymentMethod?: string;

  @ApiProperty({
    required: false,
    description: 'Mercado Pago: the one-time card token made in the browser',
  })
  cardToken?: string;

  @ApiProperty({ required: false, example: 'visa' })
  cardBrand?: string;

  @ApiProperty({ required: false })
  payerEmail?: string;
}

/** Orders of the logged-in user; the store API reads the user from the session and checks the rules. */
@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly http: HttpService) {}

  @Post()
  @ApiOperation({
    summary: 'Place an order from my cart',
    description:
      'Send an Idempotency-Key header (8 to 128 letters, digits, - or _): a retry with the same key returns the same order instead of a second one.',
  })
  @ApiQuery({ name: 'store', description: 'The link of the store' })
  @ApiQuery({
    name: 'delivery',
    required: false,
    enum: ['SHIPPING', 'PICKUP'],
    description: 'How the order is delivered; shipping by default',
  })
  @ApiResponse({ status: 201, type: OrderDto })
  @ApiResponse({
    status: 409,
    description: 'Empty cart, a product no longer on sale or not enough stock',
  })
  place(
    @Query('store') store?: string,
    @Headers('authorization') authorization?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Query('delivery') delivery?: string,
    @Body() body?: { shippingAddress?: Record<string, string> },
  ) {
    return callStoreApi(this.http, 'post', '/orders', {
      authorization,
      body,
      query: { store, delivery },
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      fallback: 'Erro ao fazer o pedido',
    });
  }

  @Get()
  @ApiOperation({ summary: 'List my orders, newest first' })
  @ApiQuery({
    name: 'store',
    required: false,
    description: 'Only the orders of the store at this link',
  })
  @ApiResponse({ status: 200, type: [OrderDto] })
  mine(
    @Query('store') store?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'get', '/orders', {
      authorization,
      query: { store },
      fallback: 'Erro ao listar os pedidos',
    });
  }

  @Get('store')
  @ApiOperation({
    summary: 'The orders of my store, newest first (seller only)',
  })
  ofStore(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/orders/store', {
      authorization,
      fallback: 'Erro ao listar os pedidos da loja',
    });
  }

  @Get('addresses')
  @ApiOperation({
    summary: 'My saved delivery addresses, the latest used first',
  })
  addresses(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/orders/addresses', {
      authorization,
      fallback: 'Could not load your addresses',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one of my orders (an admin can read any)' })
  @ApiResponse({ status: 200, type: OrderDto })
  one(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'get', `/orders/${encodeURIComponent(id)}`, {
      authorization,
      fallback: 'Erro ao carregar o pedido',
    });
  }

  @Post(':id/pay')
  @ApiOperation({
    summary:
      'Pay one of my orders (test mode); paying a paid order is harmless',
  })
  @ApiResponse({ status: 201, type: OrderDto })
  @ApiResponse({ status: 402, description: 'The payment was declined' })
  @ApiResponse({
    status: 409,
    description: 'The order is shipped, delivered or cancelled',
  })
  pay(
    @Param('id') id: string,
    @Body() body: PayOrderDto,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `/orders/${encodeURIComponent(id)}/pay`,
      {
        authorization,
        body: {
          paymentMethod: body?.paymentMethod,
          cardToken: body?.cardToken,
          cardBrand: body?.cardBrand,
          payerEmail: body?.payerEmail,
        },
        fallback: 'Erro ao pagar o pedido',
      },
    );
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary:
      'Cancel an order: its owner while it waits for payment; a seller or admin also after payment (refunded)',
  })
  @ApiResponse({ status: 201, type: OrderDto })
  @ApiResponse({
    status: 403,
    description: 'A customer cannot cancel a paid order',
  })
  @ApiResponse({
    status: 409,
    description: 'The order is shipped or delivered',
  })
  cancel(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `/orders/${encodeURIComponent(id)}/cancel`,
      { authorization, fallback: 'Erro ao cancelar o pedido' },
    );
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Mark a paid order as shipped (seller or admin)' })
  @ApiResponse({ status: 201, type: OrderDto })
  ship(
    @Param('id') id: string,
    @Body() body?: { trackingCode?: string },
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `/orders/${encodeURIComponent(id)}/ship`,
      {
        authorization,
        body,
        fallback: 'Erro ao enviar o pedido',
      },
    );
  }

  @Post(':id/invoice')
  @ApiOperation({
    summary:
      'Add the link to the tax invoice of a paid order (seller or admin)',
  })
  @ApiResponse({ status: 201, type: OrderDto })
  invoice(
    @Param('id') id: string,
    @Body() body: { invoiceUrl: string },
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `/orders/${encodeURIComponent(id)}/invoice`,
      { authorization, body, fallback: 'Could not save the invoice' },
    );
  }

  @Post(':id/deliver')
  @ApiOperation({
    summary: 'Mark a shipped order as delivered (seller or admin)',
  })
  @ApiResponse({ status: 201, type: OrderDto })
  deliver(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `/orders/${encodeURIComponent(id)}/deliver`,
      {
        authorization,
        fallback: 'Erro ao entregar o pedido',
      },
    );
  }
}
