import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BillingController } from './billing.controller';

@Module({
  imports: [HttpModule],
  controllers: [BillingController],
})
export class BillingModule {}
