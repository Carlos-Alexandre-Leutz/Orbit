import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiExcludeController } from '@nestjs/swagger';
import { callStoreApi } from '../upstream';
import { adminPath } from './admin-path';

const BASE = `/${adminPath()}`;

/** The Orbit owner's area; the store API checks that the session belongs to an admin on every call. */
// Left out of the public API docs: its address is a secret.
@ApiExcludeController()
@Controller(adminPath() ?? 'unavailable')
export class AdminController {
  constructor(private readonly http: HttpService) {}

  @Get('overview')
  overview(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', `${BASE}/overview`, {
      authorization,
      fallback: 'Could not load the overview',
    });
  }

  @Get('plans')
  plans(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', `${BASE}/plans`, {
      authorization,
      fallback: 'Could not load the plans',
    });
  }

  @Put('plans/:id')
  setPrice(
    @Param('id') id: string,
    @Body() body: { priceCents: number },
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'put',
      `${BASE}/plans/${encodeURIComponent(id)}`,
      { authorization, body, fallback: 'Could not save the price' },
    );
  }

  @Get('stores')
  stores(
    @Query('q') q?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'get', `${BASE}/stores`, {
      authorization,
      query: q ? { q } : undefined,
      fallback: 'Could not list the stores',
    });
  }

  @Get('stores/:slug')
  store(
    @Param('slug') slug: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'get',
      `${BASE}/stores/${encodeURIComponent(slug)}`,
      { authorization, fallback: 'Could not load the store' },
    );
  }

  @Post('stores/:slug/record-payment')
  recordPayment(
    @Param('slug') slug: string,
    @Body() body: { months?: number; note?: string },
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `${BASE}/stores/${encodeURIComponent(slug)}/record-payment`,
      { authorization, body, fallback: 'Could not record the payment' },
    );
  }

  @Post('stores/:slug/suspend')
  suspend(
    @Param('slug') slug: string,
    @Body() body: { reason: string },
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `${BASE}/stores/${encodeURIComponent(slug)}/suspend`,
      { authorization, body, fallback: 'Could not suspend the store' },
    );
  }

  @Post('stores/:slug/reactivate')
  reactivate(
    @Param('slug') slug: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `${BASE}/stores/${encodeURIComponent(slug)}/reactivate`,
      { authorization, body: {}, fallback: 'Could not reactivate the store' },
    );
  }
}
