// Safe to import from client components (no server-only code here).

export type DeliveryMethod = 'SHIPPING' | 'PICKUP';

export interface ShippingRules {
  shippingFlatCents?: number | undefined;
  freeShippingOverCents?: number | null | undefined;
  pickupEnabled?: boolean | undefined;
  /** Business days to prepare an order, and the shortest and longest trip. */
  handlingDays?: number | undefined;
  deliveryDaysMin?: number | undefined;
  deliveryDaysMax?: number | undefined;
  /** Trip days per destination state, which replace the general ones. */
  deliveryByState?: Record<string, { min: number; max: number }> | undefined;
}

export const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from);
  let left = days;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return date;
}

/**
 * When an order placed today arrives, with the same rules as the API (which saves the real window on the order):
 * preparation plus the shortest and the longest trip, in business days. A pickup only waits for the preparation.
 */
export function estimateWindow(
  rules: ShippingRules,
  method: DeliveryMethod,
  from: Date = new Date(),
  state?: string,
): { from: Date; to: Date } {
  const handling = rules.handlingDays ?? 1;
  if (method === 'PICKUP') {
    const ready = addBusinessDays(from, handling);
    return { from: ready, to: ready };
  }
  // The trip of the destination state, when the seller set it, replaces the general trip days.
  const own = state ? rules.deliveryByState?.[state.toUpperCase()] : undefined;
  const min = own?.min ?? rules.deliveryDaysMin ?? 3;
  const max = own?.max ?? rules.deliveryDaysMax ?? 7;
  return {
    from: addBusinessDays(from, handling + min),
    to: addBusinessDays(from, handling + max),
  };
}

/**
 * What delivery costs, with the same rules as the API (which prices the real order): nothing for a pickup the
 * store allows, nothing above the free-shipping threshold, otherwise the flat fee. Null when not offered.
 */
export function shippingCents(
  rules: ShippingRules,
  itemsCents: number,
  method: DeliveryMethod,
): number | null {
  if (method === 'PICKUP') return rules.pickupEnabled ? 0 : null;
  const free = rules.freeShippingOverCents;
  if (free !== null && free !== undefined && itemsCents >= free) return 0;
  return rules.shippingFlatCents ?? 0;
}

/** The line shown in the bar at the top of a store, built from its shipping rules; null when there is nothing to say. */
export function announcementFor(
  rules: ShippingRules,
  formatPrice: (cents: number) => string,
): string | null {
  const free = rules.freeShippingOverCents;
  if (free !== null && free !== undefined) {
    return `Free shipping on orders over ${formatPrice(free)}`;
  }
  if ((rules.shippingFlatCents ?? 0) === 0)
    return 'Free shipping on every order';
  if (rules.pickupEnabled) return 'Pick up your order at the store, free';
  return null;
}
