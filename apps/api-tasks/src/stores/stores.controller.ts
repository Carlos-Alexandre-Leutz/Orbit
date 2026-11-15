import { Controller, Get, Param } from '@nestjs/common';
import { StoresService } from './stores.service';

/** The stores are public: a buyer finds a store and opens it without an account. */
@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  list() {
    return this.stores.list();
  }

  @Get(':slug')
  one(@Param('slug') slug: string) {
    return this.stores.publicBySlug(slug);
  }
}
