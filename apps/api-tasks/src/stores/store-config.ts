/** The choices a seller makes about a store. Pure data and rules, shared by the DTOs and the services. */

export const TEMPLATES = ['classic', 'bold', 'minimal'] as const;
export type Template = (typeof TEMPLATES)[number];

/** The color a template starts with; the seller can change it later. */
export const TEMPLATE_COLORS: Record<Template, string> = {
  classic: '#2563eb',
  bold: '#dc2626',
  minimal: '#111827',
};

export const SELLING_MODES = [
  'online',
  'physical',
  'dropshipping',
  'print_on_demand',
  'digital',
  'migrate',
] as const;

/** Only the card in test mode works; the others are listed so a seller sees what is coming. */
export const PAYMENT_METHODS = ['card'] as const;

export const DELIVERY_METHODS = ['SHIPPING', 'PICKUP'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export interface ShippingRules {
  shippingFlatCents: number;
  freeShippingOverCents: number | null;
  pickupEnabled: boolean;
}

/**
 * What the customer pays for delivery: nothing for a pickup (when the store allows it), nothing above the
 * free-shipping threshold, otherwise the flat fee. Returns null when the method is not offered.
 */
export function shippingCents(
  rules: ShippingRules,
  itemsCents: number,
  method: DeliveryMethod,
): number | null {
  if (method === 'PICKUP') return rules.pickupEnabled ? 0 : null;
  if (
    rules.freeShippingOverCents !== null &&
    itemsCents >= rules.freeShippingOverCents
  ) {
    return 0;
  }
  return rules.shippingFlatCents;
}

/** The reassurances a seller can pick for the strip under the banner. The text is theirs to edit. */
export const HIGHLIGHT_IDS = [
  'free_shipping',
  'fast_delivery',
  'pickup',
  'secure_checkout',
  'installments',
  'easy_returns',
  'warranty',
  'support',
] as const;

export const MAX_HIGHLIGHTS = 4;

/** The payment providers a seller can connect, each with the shape its keys must have. */
export const PAYMENT_PROVIDERS = ['stripe', 'mercadopago'];

/** The key formats, checked before anything is stored; the mode of a Stripe pair (test or live) must match. */
export const PAYMENT_KEY_FORMATS: Record<
  string,
  { secret: RegExp; publicKey: RegExp; webhook: RegExp }
> = {
  stripe: {
    secret: /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/,
    publicKey: /^pk_(test|live)_[A-Za-z0-9]+$/,
    webhook: /^whsec_[A-Za-z0-9]+$/,
  },
  mercadopago: {
    secret: /^(TEST|APP_USR)-[A-Za-z0-9-]+$/,
    publicKey: /^(TEST|APP_USR)-[A-Za-z0-9-]+$/,
    webhook: /^[A-Za-z0-9]{16,128}$/,
  },
};

/** How many banners a store can show in the carousel at the top of its page. */
export const MAX_BANNERS = 5;

export interface Highlight {
  id: string;
  text?: string;
}

export const BRAZIL_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export type DeliveryByState = Record<string, { min: number; max: number }>;

/**
 * Checks the trip days a seller set per destination state and returns them in the stored shape. Returns a message
 * instead when something is wrong, so the caller can refuse the request with it.
 */
export function parseDeliveryByState(
  input: unknown,
): { value: DeliveryByState } | { error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'deliveryByState must be an object' };
  }
  const value: DeliveryByState = {};
  for (const [rawState, trip] of Object.entries(input)) {
    const state = rawState.toUpperCase();
    const { min, max } = (trip ?? {}) as { min?: unknown; max?: unknown };
    if (!(BRAZIL_STATES as readonly string[]).includes(state)) {
      return { error: `${rawState} is not a state code` };
    }
    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      (min as number) < 0 ||
      (max as number) > 90 ||
      (min as number) > (max as number)
    ) {
      return { error: `The days for ${state} are not valid` };
    }
    value[state] = { min: min as number, max: max as number };
  }
  return { value };
}
