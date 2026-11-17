import {
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { presentOrder, WITH_ITEMS } from '../orders/order-presenter';
import { PaymentProvider, WebhookExtra } from './payment-provider';
import { StorePaymentProviders } from './store-payment-provider.registry';

/** Used when the customer picks nothing: Stripe's test card that always succeeds. */
export const DEFAULT_PAYMENT_METHOD = 'pm_card_visa';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: StorePaymentProviders,
    private readonly platform: PaymentProvider,
  ) {}

  /**
   * Charges the order of the logged-in user. Paying a paid order returns it unchanged, so a double click or a
   * retry after a timeout is safe. A declined payment leaves the order unpaid, ready for another try.
   */
  async pay(
    orderId: string,
    userId: string,
    paymentMethod = DEFAULT_PAYMENT_METHOD,
    card: { cardToken?: string; cardBrand?: string; payerEmail?: string } = {},
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
    const store = await this.prisma.store.findUnique({
      where: { id: order.storeId },
      select: { suspendedAt: true },
    });
    if (store?.suspendedAt) {
      throw new ConflictException({
        statusCode: 409,
        code: 'STORE_SUSPENDED',
        message: 'This store is not accepting payments right now',
      });
    }
    const provider = await this.providers.forStoreId(order.storeId);
    const result = await provider.charge({
      orderId: order.id,
      amountCents: order.totalCents,
      currency: order.currency,
      paymentMethod,
      idempotencyKey: `order-${order.id}-${card.cardToken ?? paymentMethod}`,
      ...card,
    });
    if (result.status === 'declined') {
      throw new HttpException(
        {
          statusCode: 402,
          code: 'PAYMENT_DECLINED',
          message: `Payment declined${result.reason ? `: ${result.reason}` : ''}`,
        },
        402,
      );
    }
    if (result.status === 'succeeded') {
      const paid = await this.markPaid(this.prisma, order.id, result.reference);
      if (!paid) {
        // Money was taken but the order is no longer waiting for it (cancelled or paid by another call).
        await this.refundStray(order.id, result.reference, order.totalCents);
      }
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
  async handleEvent(
    rawBody: Buffer,
    signature: string | undefined,
    storeSlug?: string,
    extra?: WebhookExtra,
  ) {
    // A store's own webhook is checked with that store's secret; the platform one with the environment's.
    const provider = storeSlug
      ? await this.providers.forSlug(storeSlug)
      : this.platform;
    const event = await provider.readEvent(rawBody, signature, extra);
    if (event.type === 'ignored') {
      return;
    }
    let stray: { orderId: string; reference: string } | undefined;
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
          stray = { orderId: event.orderId, reference: event.reference };
        }
      }
    });
    if (stray) {
      const order = await this.prisma.order.findUnique({
        where: { id: stray.orderId },
      });
      if (order) {
        await this.refundStray(order.id, stray.reference, order.totalCents);
      }
    }
  }

  /**
   * Gives back the payment of a cancelled order. It is safe to call again: the refund has an idempotency key
   * and the order keeps the refund reference, so a second call changes nothing.
   */
  async refundOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    if (!order.paymentRef || order.refundRef) {
      return;
    }
    const refund = await (
      await this.providers.forStoreId(order.storeId)
    ).refund({
      paymentReference: order.paymentRef,
      amountCents: order.totalCents,
      idempotencyKey: `refund-${order.paymentRef}`,
    });
    await this.prisma.order.updateMany({
      where: { id: orderId, refundRef: null },
      data: { refundRef: refund.reference },
    });
  }

  /**
   * A payment arrived for an order that cannot take it. If the order is paid with this very payment there is
   * nothing to do; otherwise the money is given back, and a cancelled order that has no payment of its own
   * records this one so the refund is traceable.
   */
  private async refundStray(
    orderId: string,
    reference: string,
    amountCents: number,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (order?.paymentRef === reference) {
      return;
    }
    this.logger.warn(
      `Payment ${reference} reached order ${orderId} in state ${order?.status}; refunding it`,
    );
    const provider = order
      ? await this.providers.forStoreId(order.storeId)
      : this.platform;
    const refund = await provider.refund({
      paymentReference: reference,
      amountCents,
      idempotencyKey: `refund-${reference}`,
    });
    if (order && order.status === 'CANCELLED' && !order.paymentRef) {
      await this.prisma.order.updateMany({
        where: { id: orderId, paymentRef: null },
        data: { paymentRef: reference, refundRef: refund.reference },
      });
    }
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
