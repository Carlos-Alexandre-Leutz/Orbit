import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module';
import { DatabaseImageStorage, ImageStorage } from './image-storage';
import { ImagesController } from './images.controller';

@Module({
  imports: [StoresModule],
  controllers: [ImagesController],
  providers: [{ provide: ImageStorage, useClass: DatabaseImageStorage }],
  exports: [ImageStorage],
})
export class ImagesModule {}
