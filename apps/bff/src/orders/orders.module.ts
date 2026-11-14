import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrdersController } from './orders.controller';

@Module({
  imports: [HttpModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
