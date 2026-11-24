import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createPaymentProvider } from './payment-provider.factory';
import { PaymentProvider } from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StorePaymentProviders } from './store-payment-provider.registry';

@Module({
  controllers: [PaymentsController],
  providers: [
    { provide: PaymentProvider, useFactory: () => createPaymentProvider() },
    {
      provide: StorePaymentProviders,
      inject: [PrismaService, PaymentProvider],
      useFactory: (prisma: PrismaService, fallback: PaymentProvider) =>
        new StorePaymentProviders(prisma, fallback),
    },
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
