import { Module } from '@nestjs/common';
import { DatabaseImageStorage, ImageStorage } from './image-storage';

/** The picture storage on its own, so the stores and the catalog can use it without a module cycle. */
@Module({
  providers: [{ provide: ImageStorage, useClass: DatabaseImageStorage }],
  exports: [ImageStorage],
})
export class ImageStorageModule {}
