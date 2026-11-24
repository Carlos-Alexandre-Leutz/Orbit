import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { ConnectPaymentDto } from './dto/connect-payment.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoresService } from './stores.service';

/**
 * The stores are public: a buyer finds a store and opens it without an account. The `mine` routes belong to
 * the logged-in seller, and the store is read from the session, never from the request. They come before
 * `:slug` so that "mine" is never taken for a store link.
 */
@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get('mine')
  @Auth('SELLER')
  mine(@Req() request: AuthenticatedRequest) {
    return this.stores.mineOf(request.user.id);
  }

  @Patch('mine')
  @Auth('SELLER')
  update(@Req() request: AuthenticatedRequest, @Body() body: UpdateStoreDto) {
    return this.stores.updateOwn(request.user.id, body);
  }

  @Put('mine/payments')
  @Auth('SELLER')
  connectPayments(
    @Req() request: AuthenticatedRequest,
    @Body() body: ConnectPaymentDto,
  ) {
    return this.stores.connectPayments(request.user.id, body);
  }

  @Delete('mine/payments')
  @Auth('SELLER')
  disconnectPayments(@Req() request: AuthenticatedRequest) {
    return this.stores.disconnectPayments(request.user.id);
  }

  @Get('mine/summary')
  @Auth('SELLER')
  summary(@Req() request: AuthenticatedRequest) {
    return this.stores.summaryOf(request.user.id);
  }

  @Get(':slug/categories')
  categories(@Param('slug') slug: string) {
    return this.stores.categoriesOf(slug);
  }

  @Get(':slug')
  one(@Param('slug') slug: string) {
    return this.stores.publicBySlug(slug);
  }
}
