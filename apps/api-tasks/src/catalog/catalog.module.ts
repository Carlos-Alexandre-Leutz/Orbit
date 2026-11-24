import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { ImageStorageModule } from '../images/image-storage.module';
import { StoresModule } from '../stores/stores.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [StoresModule, ImageStorageModule],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class CatalogModule {}
