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

/** Where a shipped order goes, as the customer typed it at checkout. */
export interface ShippingAddress {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
}

/** An address kept on the account, picked again at checkout. */
export interface SavedAddress extends ShippingAddress {
  id: string;
}

/** The address as the lines of a label. */
export function addressLines(a: ShippingAddress): string[] {
  const cep = a.postalCode.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  return [
    a.recipientName,
    `${a.street}, ${a.number}${a.complement ? `, ${a.complement}` : ''}`,
    `${a.district}, ${a.city} - ${a.state}`,
    `CEP ${cep}`,
    `Phone ${a.recipientPhone}`,
  ];
}

/** "Mar 3" or "Mar 3 to Mar 7": the delivery window, or the single day when both ends are the same. */
export function formatWindow(from: string | Date, to: string | Date): string {
  const day = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const start = day(from);
  const end = day(to);
  return start === end ? start : `${start} to ${end}`;
}

export interface Order {
  id: string;
  status: OrderStatus;
  store: { slug: string; name: string };
  currency: string;
  /** The total of the items plus the shipping. */
  totalCents: number;
  shippingCents: number;
  deliveryMethod: 'SHIPPING' | 'PICKUP';
  /** Where it goes; null for a pickup. */
  shippingAddress: ShippingAddress | null;
  trackingCode: string | null;
  /** The link to the tax invoice (nota fiscal), added by the seller. */
  invoiceUrl: string | null;
  /** The delivery window promised at checkout. */
  estimatedFrom: string | null;
  estimatedTo: string | null;
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
