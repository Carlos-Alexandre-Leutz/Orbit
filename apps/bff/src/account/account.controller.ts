import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
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

export class ConsentBody {
  @ApiProperty({ description: 'Whether this store may send marketing' })
  marketingConsent: boolean;
}

/** The account of the logged-in customer, valid in every store; the store API checks the session and the role. */
@ApiTags('account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private readonly http: HttpService) {}

  @Get('stores')
  @ApiOperation({ summary: 'The stores I joined or bought from, with consent' })
  @ApiResponse({ status: 200 })
  stores(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/account/stores', {
      authorization,
      fallback: 'Could not load your stores',
    });
  }

  @Patch('stores/:slug')
  @ApiOperation({ summary: 'Give or withdraw marketing consent for one store' })
  consent(
    @Param('slug') slug: string,
    @Body() body: ConsentBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'patch',
      `/account/stores/${encodeURIComponent(slug)}`,
      { authorization, body, fallback: 'Could not save your choice' },
    );
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete my account (orders stay, anonymised)',
  })
  async remove(@Headers('authorization') authorization?: string) {
    await callStoreApi(this.http, 'delete', '/account', {
      authorization,
      fallback: 'Could not delete the account',
    });
  }
}

/** The customers of the seller's own store. */
@ApiTags('account')
@ApiBearerAuth()
@Controller('store-customers')
export class StoreCustomersController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'The customers of my store (seller only)' })
  list(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/store-customers', {
      authorization,
      fallback: 'Could not load the customers',
    });
  }
}
