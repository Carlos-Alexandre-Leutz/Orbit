import { Prisma } from '@prisma/client';

export const WITH_ITEMS = { items: { orderBy: { name: 'asc' as const } } };
export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof WITH_ITEMS;
}>;

/** What the API shows of an order. */
export function presentOrder(order: OrderWithItems) {
  return {
    id: order.id,
    status: order.status,
    currency: order.currency,
    totalCents: order.totalCents,
    items: order.items.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      priceCents: item.priceCents,
      quantity: item.quantity,
      lineTotalCents: item.priceCents * item.quantity,
    })),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    refunded: order.refundRef !== null,
  };
}
