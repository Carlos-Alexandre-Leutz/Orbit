import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { CartService } from './cart.service';
import { AddToCartDto, SetQuantityDto } from './dto/cart.dto';

/** The cart of the logged-in user. The user id always comes from the token, never from the request. */
@Controller('cart')
@Auth()
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  view(@Req() request: AuthenticatedRequest) {
    return this.cart.view(request.user.id);
  }

  @Post('items')
  add(@Req() request: AuthenticatedRequest, @Body() dto: AddToCartDto) {
    return this.cart.add(request.user.id, dto.productId, dto.quantity);
  }

  @Patch('items/:productId')
  setQuantity(
    @Req() request: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetQuantityDto,
  ) {
    return this.cart.setQuantity(request.user.id, productId, dto.quantity);
  }

  @Delete('items/:productId')
  @HttpCode(204)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.cart.remove(request.user.id, productId);
  }

  @Delete()
  @HttpCode(204)
  clear(@Req() request: AuthenticatedRequest) {
    return this.cart.clear(request.user.id);
  }
}
