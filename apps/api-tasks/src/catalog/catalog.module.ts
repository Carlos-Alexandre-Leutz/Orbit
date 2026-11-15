import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { StoresModule } from '../stores/stores.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [StoresModule],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService],
})
export class CatalogModule {}
