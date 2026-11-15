// Safe to import from client components (no server-only code here).

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderLine {
  productId: string;
  sku: string;
  name: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  currency: string;
  totalCents: number;
  items: OrderLine[];
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  refunded: boolean;
}

const LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Waiting for payment',
  PAID: 'Paid',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function statusLabel(status: OrderStatus): string {
  return LABELS[status];
}

/** The test cards the pay form offers. They are Stripe's test payment methods; no card number is ever typed. */
export const TEST_CARDS = [
  { id: 'pm_card_visa', label: 'Visa test card (approved)' },
  { id: 'pm_card_chargeDeclined', label: 'Test card that is declined' },
] as const;

/**
 * Whether to offer "Cancel order". A customer can cancel only while the order waits for payment; a seller or
 * admin also after payment. The API enforces the same rules: this only avoids offering a button that would fail.
 */
export function canCancel(
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN',
  status: OrderStatus,
): boolean {
  if (status === 'PENDING_PAYMENT') return true;
  return status === 'PAID' && role !== 'CUSTOMER';
}

export function canPay(status: OrderStatus): boolean {
  return status === 'PENDING_PAYMENT';
}
