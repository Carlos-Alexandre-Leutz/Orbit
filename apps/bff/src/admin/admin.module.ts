import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminController } from './admin.controller';

@Module({
  imports: [HttpModule],
  controllers: [AdminController],
})
export class AdminModule {}
