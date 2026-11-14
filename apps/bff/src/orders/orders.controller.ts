import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
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
  @ApiProperty({
    enum: ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  })
  status: string;
  @ApiProperty({ example: 'USD' }) currency: string;
  @ApiProperty({ description: 'Total in cents' }) totalCents: number;
  @ApiProperty({ type: [OrderLineDto] }) items: OrderLineDto[];
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true }) paidAt: string | null;
  @ApiProperty({ nullable: true }) shippedAt: string | null;
  @ApiProperty({ nullable: true }) deliveredAt: string | null;
  @ApiProperty({ nullable: true }) cancelledAt: string | null;
}

/** Orders of the logged-in user; the store API reads the user from the session and checks the rules. */
@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly http: HttpService) {}

  @Post()
  @ApiOperation({ summary: 'Place an order from my cart' })
  @ApiResponse({ status: 201, type: OrderDto })
  @ApiResponse({
    status: 409,
    description: 'Empty cart, a product no longer on sale or not enough stock',
  })
  place(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'post', '/orders', {
      authorization,
      fallback: 'Erro ao fazer o pedido',
    });
  }

  @Get()
  @ApiOperation({ summary: 'List my orders, newest first' })
  @ApiResponse({ status: 200, type: [OrderDto] })
  mine(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/orders', {
      authorization,
      fallback: 'Erro ao listar os pedidos',
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

  @Post(':id/ship')
  @ApiOperation({ summary: 'Mark a paid order as shipped (seller or admin)' })
  @ApiResponse({ status: 201, type: OrderDto })
  ship(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `/orders/${encodeURIComponent(id)}/ship`,
      {
        authorization,
        fallback: 'Erro ao enviar o pedido',
      },
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
