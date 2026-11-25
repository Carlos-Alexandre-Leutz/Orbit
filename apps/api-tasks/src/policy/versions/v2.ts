/**
 * Governance policy, version 2. The only agent is now the assistant a store shows to its visitors, which
 * reads the store and cannot buy, so the `store.*` tools are the only ones listed. The cart and order tools
 * still exist in the tool layer, but no role may use them until an agent that buys comes back. A visitor
 * acts as `CUSTOMER`, and the call limits count per visitor (the actor id is `visitor:<id>`).
 */
const visitorTools = {
  'store.info': { maxCallsPerHour: 60 },
  'store.search_products': { maxCallsPerHour: 120 },
  'store.delivery_estimate': { maxCallsPerHour: 60 },
};

export const POLICY_V2: unknown = {
  version: 2,
  description:
    'Visitors of a store read its public data through the store tools; no role buys through an agent.',
  roles: {
    CUSTOMER: { tools: visitorTools },
    SELLER: { tools: {} },
    ADMIN: { tools: {} },
  },
};
