import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { StoresService } from '../stores/stores.service';
import { CartService } from './cart.service';
import { AddToCartDto, SetQuantityDto } from './dto/cart.dto';

/**
 * The cart of the logged-in customer in one store, named by its link in `?store=`. The user id always
 * comes from the token. Anyone with an Orbit account shops, a seller included; admins do not buy.
 */
@Controller('cart')
@Auth('CUSTOMER', 'SELLER')
export class CartController {
  constructor(
    private readonly cart: CartService,
    private readonly stores: StoresService,
  ) {}

  private async storeId(slug?: string) {
    if (!slug) {
      throw new BadRequestException('The store link is required (?store=)');
    }
    return (await this.stores.bySlug(slug)).id;
  }

  @Get()
  async view(
    @Req() request: AuthenticatedRequest,
    @Query('store') store?: string,
  ) {
    return this.cart.view(request.user.id, await this.storeId(store));
  }

  @Post('items')
  async add(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AddToCartDto,
    @Query('store') store?: string,
  ) {
    return this.cart.add(
      request.user.id,
      await this.storeId(store),
      dto.productId,
      dto.quantity,
    );
  }

  @Patch('items/:productId')
  async setQuantity(
    @Req() request: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetQuantityDto,
    @Query('store') store?: string,
  ) {
    return this.cart.setQuantity(
      request.user.id,
      await this.storeId(store),
      productId,
      dto.quantity,
    );
  }

  @Delete('items/:productId')
  @HttpCode(204)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('store') store?: string,
  ) {
    return this.cart.remove(
      request.user.id,
      await this.storeId(store),
      productId,
    );
  }

  @Delete()
  @HttpCode(204)
  async clear(
    @Req() request: AuthenticatedRequest,
    @Query('store') store?: string,
  ) {
    return this.cart.clear(request.user.id, await this.storeId(store));
  }
}
