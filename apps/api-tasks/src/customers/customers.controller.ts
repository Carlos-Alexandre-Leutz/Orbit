import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { ConversationMemory } from '../memory/conversation-memory';
import { ConsentDto } from './dto/consent.dto';
import { CustomersService } from './customers.service';

/** The shopping account of the logged-in user (a seller shops too), valid in every store. */
@Controller('account')
@Auth('CUSTOMER', 'SELLER')
export class AccountController {
  constructor(
    private readonly customers: CustomersService,
    private readonly memory: ConversationMemory,
  ) {}

  @Get('stores')
  stores(@Req() request: AuthenticatedRequest) {
    return this.customers.storesOf(request.user.id);
  }

  @Patch('stores/:slug')
  consent(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() body: ConsentDto,
  ) {
    return this.customers.setConsent(
      request.user.id,
      slug,
      body.marketingConsent,
    );
  }

  @Delete()
  @HttpCode(204)
  async remove(@Req() request: AuthenticatedRequest) {
    await this.customers.deleteAccount(request.user.id);
    // The chats go with the account; a failure here must not undo the deletion.
    await this.memory.deleteAllOf(request.user.id).catch(() => undefined);
  }
}

/** The customers of the seller's own store; the store is read from the session. */
@Controller('store-customers')
@Auth('SELLER')
export class StoreCustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.customers.ofSellerStore(request.user.id);
  }
}
