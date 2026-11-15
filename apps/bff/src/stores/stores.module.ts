import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StoresController } from './stores.controller';

@Module({
  imports: [HttpModule],
  controllers: [StoresController],
})
export class StoresModule {}
