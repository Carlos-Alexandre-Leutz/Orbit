import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [HttpModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
