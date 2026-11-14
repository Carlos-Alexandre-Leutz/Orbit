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
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
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

/** The cart of the logged-in user; the store API reads the user from the session. */
@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'Read my cart' })
  @ApiResponse({ status: 200, type: CartDto })
  view(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/cart', {
      authorization,
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
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'post', '/cart/items', {
      body,
      authorization,
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
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'patch',
      `/cart/items/${encodeURIComponent(productId)}`,
      {
        body,
        authorization,
        fallback: 'Erro ao alterar o carrinho',
      },
    );
  }

  @Delete('items/:productId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a line from my cart' })
  removeLine(
    @Param('productId') productId: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'delete',
      `/cart/items/${encodeURIComponent(productId)}`,
      {
        authorization,
        fallback: 'Erro ao remover do carrinho',
      },
    );
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Empty my cart' })
  clear(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'delete', '/cart', {
      authorization,
      fallback: 'Erro ao esvaziar o carrinho',
    });
  }
}
