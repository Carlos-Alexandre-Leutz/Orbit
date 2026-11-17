import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module';
import { ImageStorageModule } from './image-storage.module';
import { ImagesController } from './images.controller';

@Module({
  imports: [StoresModule, ImageStorageModule],
  controllers: [ImagesController],
})
export class ImagesModule {}
