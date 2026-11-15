import {
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { presentOrder, WITH_ITEMS } from '../orders/orders.service';
import { PaymentProvider } from './payment-provider';

/** Used when the customer picks nothing: Stripe's test card that always succeeds. */
export const DEFAULT_PAYMENT_METHOD = 'pm_card_visa';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymentProvider,
  ) {}

  /**
   * Charges the order of the logged-in user. Paying a paid order returns it unchanged, so a double click or a
   * retry after a timeout is safe. A declined payment leaves the order unpaid, ready for another try.
   */
  async pay(
    orderId: string,
    userId: string,
    paymentMethod = DEFAULT_PAYMENT_METHOD,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: WITH_ITEMS,
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.status === 'PAID') {
      return presentOrder(order);
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new ConflictException({
        statusCode: 409,
        code: 'NOT_PAYABLE',
        message: `Um pedido ${order.status} não pode ser pago`,
      });
    }
    // The key names the method: a retry with the same card never charges twice, and a new card after a
    // decline is a new attempt.
    const result = await this.provider.charge({
      orderId: order.id,
      amountCents: order.totalCents,
      currency: order.currency,
      paymentMethod,
      idempotencyKey: `order-${order.id}-${paymentMethod}`,
    });
    if (result.status === 'declined') {
      throw new HttpException(
        {
          statusCode: 402,
          code: 'PAYMENT_DECLINED',
          message: `Pagamento recusado${result.reason ? `: ${result.reason}` : ''}`,
        },
        402,
      );
    }
    if (result.status === 'succeeded') {
      await this.markPaid(this.prisma, order.id, result.reference);
    }
    // A pending payment stays PENDING_PAYMENT until the provider's webhook confirms it.
    const fresh = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: WITH_ITEMS,
    });
    return presentOrder(fresh);
  }

  /**
   * Applies one provider event. The event id is recorded in the same transaction as its effect, so a repeated
   * event does nothing and a crash cannot leave the event recorded without its effect.
   */
  async handleEvent(rawBody: Buffer, signature: string | undefined) {
    const event = this.provider.readEvent(rawBody, signature);
    if (event.type === 'ignored') {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      const recorded = await tx.processedPaymentEvent.createMany({
        data: [{ id: event.id }],
        skipDuplicates: true,
      });
      if (recorded.count === 0) {
        return;
      }
      if (event.type === 'succeeded' && event.orderId && event.reference) {
        const paid = await this.markPaid(tx, event.orderId, event.reference);
        if (!paid) {
          this.logger.warn(
            `Payment ${event.reference} confirmed for order ${event.orderId}, which was not waiting for payment`,
          );
        }
      }
    });
  }

  /** Moves a waiting order to PAID. Returns false when the order was not waiting (already paid, cancelled...). */
  private async markPaid(
    db: PrismaService | Prisma.TransactionClient,
    orderId: string,
    reference: string,
  ): Promise<boolean> {
    const { count } = await db.order.updateMany({
      where: { id: orderId, status: 'PENDING_PAYMENT' },
      data: { status: 'PAID', paidAt: new Date(), paymentRef: reference },
    });
    return count > 0;
  }
}
