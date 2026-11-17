import { Module } from '@nestjs/common';
import { PlansService } from '../admin/plans.service';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, PlansService],
})
export class BillingModule {}
