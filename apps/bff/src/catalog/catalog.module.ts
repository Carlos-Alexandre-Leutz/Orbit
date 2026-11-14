import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [HttpModule],
  controllers: [CatalogController],
})
export class CatalogModule {}
