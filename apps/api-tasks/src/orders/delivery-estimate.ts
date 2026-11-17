/** How long a store takes: days to prepare an order, then the shortest and longest trip. All in business days. */
export interface DeliveryDays {
  handlingDays: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  /** The trip days of the states the seller priced separately, by two-letter code. */
  deliveryByState?: unknown;
}

/** The trip of one destination state, when the seller set it; null for the general days. */
export function tripOfState(
  days: DeliveryDays,
  state?: string,
): { min: number; max: number } | null {
  const table = days.deliveryByState;
  if (!state || !table || typeof table !== 'object') return null;
  const trip = (table as Record<string, { min?: unknown; max?: unknown }>)[
    state.toUpperCase()
  ];
  return trip && Number.isInteger(trip.min) && Number.isInteger(trip.max)
    ? { min: trip.min as number, max: trip.max as number }
    : null;
}

/** Adds business days (Monday to Friday; holidays are not known) to a date, keeping the time of day. */
export function addBusinessDays(from: Date, days: number): Date {
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
 * The window in which a shipped order arrives: the earliest is the preparation plus the shortest trip, the latest
 * the preparation plus the longest. When the seller set the trip of the destination state, that replaces the
 * general trip days: Acre to Acre is not Acre to Santa Catarina. A pickup only waits for the preparation. The window is promised at checkout
 * and saved on the order, so a later change of the store's days never moves an order already placed.
 */
export function estimateDelivery(
  days: DeliveryDays,
  method: 'SHIPPING' | 'PICKUP',
  from: Date = new Date(),
  state?: string,
): { from: Date; to: Date } {
  if (method === 'PICKUP') {
    const ready = addBusinessDays(from, days.handlingDays);
    return { from: ready, to: ready };
  }
  const trip = tripOfState(days, state) ?? {
    min: days.deliveryDaysMin,
    max: days.deliveryDaysMax,
  };
  return {
    from: addBusinessDays(from, days.handlingDays + trip.min),
    to: addBusinessDays(from, days.handlingDays + trip.max),
  };
}
