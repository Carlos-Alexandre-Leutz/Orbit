import { Module } from '@nestjs/common';
import { createPaymentProvider } from './payment-provider.factory';
import { PaymentProvider } from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    { provide: PaymentProvider, useFactory: () => createPaymentProvider() },
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
