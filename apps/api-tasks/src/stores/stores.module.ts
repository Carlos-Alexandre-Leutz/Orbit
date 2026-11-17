import { Module } from '@nestjs/common';
import { ImageStorageModule } from '../images/image-storage.module';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
  imports: [ImageStorageModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
