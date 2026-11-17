import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptCredentials } from './credential-cipher';
import { MercadoPagoPaymentProvider } from './mercadopago-payment.provider';
import { PaymentProvider } from './payment-provider';
import { StripePaymentProvider } from './stripe-payment.provider';

export interface StoredCredentials {
  secretKey: string;
  webhookSecret: string;
}

/**
 * Finds the payment provider of a store: the one its seller connected (ADR-008). A store that connected
 * none uses the provider chosen at start (Stripe keys from the environment, or the fake) outside
 * production; in production it cannot take payments, because the platform never charges for a seller.
 */
@Injectable()
export class StorePaymentProviders {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fallback: PaymentProvider,
  ) {}

  forStoreId(storeId: string) {
    return this.resolve({ id: storeId });
  }

  forSlug(slug: string) {
    return this.resolve({ slug });
  }

  private async resolve(
    where: { id: string } | { slug: string },
  ): Promise<PaymentProvider> {
    const store = await this.prisma.store.findUnique({
      where,
      select: { paymentProvider: true, paymentCredentials: true },
    });
    if (!store) {
      throw new ConflictException({
        statusCode: 409,
        code: 'PAYMENT_NOT_CONFIGURED',
        message: 'This store does not exist',
      });
    }
    if (!store.paymentProvider || !store.paymentCredentials) {
      if (process.env.NODE_ENV === 'production') {
        throw new ConflictException({
          statusCode: 409,
          code: 'PAYMENT_NOT_CONFIGURED',
          message: 'This store has not connected a payment provider yet',
        });
      }
      return this.fallback;
    }
    const credentials = JSON.parse(
      decryptCredentials(store.paymentCredentials),
    ) as StoredCredentials;
    return store.paymentProvider === 'mercadopago'
      ? new MercadoPagoPaymentProvider(
          credentials.secretKey,
          credentials.webhookSecret,
        )
      : new StripePaymentProvider(
          credentials.secretKey,
          credentials.webhookSecret,
        );
  }
}
