/**
 * Governance policy, version 1 (roles x tools x limits). It is data on purpose: change it with a pull
 * request, and add `v2.ts` instead of editing a version that was already in use. It is checked against
 * the real tools when the API starts (`validatePolicy`). The numbers are a first proposal for the owner to
 * review; amounts are in cents of the store's currency.
 */
const customerTools = {
  'catalog.search': { maxCallsPerHour: 300 },
  'cart.view': { maxCallsPerHour: 300 },
  'cart.add_item': { maxCallsPerHour: 120 },
  'orders.place': {
    requiresApproval: true,
    maxAmountCents: 1_000_000,
    highValueCents: 50_000,
    maxCallsPerDay: 20,
  },
  'orders.status': { maxCallsPerHour: 300 },
  'orders.cancel': {
    requiresApproval: true,
    highValueCents: 50_000,
    maxCallsPerDay: 20,
  },
};

export const POLICY_V1: unknown = {
  version: 1,
  description:
    'Customers and sellers shop through the customer tools; admins have no agent tools yet.',
  roles: {
    CUSTOMER: { tools: customerTools },
    SELLER: { tools: customerTools },
    ADMIN: { tools: {} },
  },
};
