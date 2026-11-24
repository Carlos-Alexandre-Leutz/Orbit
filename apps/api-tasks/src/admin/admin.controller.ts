import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { adminPath } from './admin-path';
import { AdminService } from './admin.service';
import {
  RecordPaymentDto,
  SetPriceDto,
  SuspendStoreDto,
} from './dto/admin.dto';

/** The Orbit owner's area. Every route needs an ADMIN session, checked here and never only in the site. */
@Controller(adminPath() ?? 'unavailable')
@Auth('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('plans')
  plans() {
    return this.admin.listPlans();
  }

  @Put('plans/:id')
  setPrice(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: SetPriceDto,
  ) {
    return this.admin.setPlanPrice(request.user.id, id, body.priceCents);
  }

  @Get('stores')
  stores(@Query('q') q?: string) {
    return this.admin.listStores(q);
  }

  @Get('stores/:slug')
  store(@Param('slug') slug: string) {
    return this.admin.storeDetail(slug);
  }

  @Post('stores/:slug/record-payment')
  recordPayment(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() body: RecordPaymentDto,
  ) {
    return this.admin.recordPayment(
      request.user.id,
      slug,
      body.months,
      body.note,
    );
  }

  @Post('stores/:slug/suspend')
  suspend(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() body: SuspendStoreDto,
  ) {
    return this.admin.suspend(request.user.id, slug, body.reason);
  }

  @Post('stores/:slug/reactivate')
  reactivate(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ) {
    return this.admin.reactivate(request.user.id, slug);
  }
}
