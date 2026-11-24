import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
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

export class CartLineDto {
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() sku: string;
  @ApiProperty() name: string;
  @ApiProperty({ description: 'Current price in cents' }) priceCents: number;
  @ApiProperty() quantity: number;
  @ApiProperty() stock: number;
  @ApiProperty({
    description:
      'False when the product was removed or there is not enough stock',
  })
  available: boolean;
  @ApiProperty() lineTotalCents: number;
}

export class CartDto {
  @ApiProperty({ type: [CartLineDto] }) items: CartLineDto[];
  @ApiProperty({ description: 'Units in the lines that can be bought' })
  itemCount: number;
  @ApiProperty({
    description: 'Total of the lines that can be bought, in cents',
  })
  totalCents: number;
}

export class AddToCartBody {
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty({ minimum: 1 }) quantity: number;
}

export class SetQuantityBody {
  @ApiProperty({ minimum: 1 }) quantity: number;
}

/** The cart of the logged-in customer in one store (`?store=<link>`); the store API reads the user from the session. */
@ApiTags('cart')
@ApiBearerAuth()
@ApiQuery({ name: 'store', description: 'The link of the store' })
@Controller('cart')
export class CartController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'Read my cart' })
  @ApiResponse({ status: 200, type: CartDto })
  view(
    @Query('store') store?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'get', '/cart', {
      authorization,
      query: { store },
      fallback: 'Erro ao carregar o carrinho',
    });
  }

  @Post('items')
  @ApiOperation({ summary: 'Add units of a product to my cart' })
  @ApiResponse({ status: 201, type: CartDto })
  @ApiResponse({ status: 404, description: 'Unknown product' })
  @ApiResponse({ status: 409, description: 'Stock or cart limits exceeded' })
  add(
    @Body() body: AddToCartBody,
    @Query('store') store?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'post', '/cart/items', {
      body,
      authorization,
      query: { store },
      fallback: 'Erro ao adicionar ao carrinho',
    });
  }

  @Patch('items/:productId')
  @ApiOperation({
    summary: 'Set the quantity of a line (repeating it changes nothing)',
  })
  @ApiResponse({ status: 200, type: CartDto })
  setQuantity(
    @Param('productId') productId: string,
    @Body() body: SetQuantityBody,
    @Query('store') store?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'patch',
      `/cart/items/${encodeURIComponent(productId)}`,
      {
        body,
        authorization,
        query: { store },
        fallback: 'Erro ao alterar o carrinho',
      },
    );
  }

  @Delete('items/:productId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a line from my cart' })
  removeLine(
    @Param('productId') productId: string,
    @Query('store') store?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'delete',
      `/cart/items/${encodeURIComponent(productId)}`,
      {
        authorization,
        query: { store },
        fallback: 'Erro ao remover do carrinho',
      },
    );
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Empty my cart' })
  clear(
    @Query('store') store?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'delete', '/cart', {
      authorization,
      query: { store },
      fallback: 'Erro ao esvaziar o carrinho',
    });
  }
}
