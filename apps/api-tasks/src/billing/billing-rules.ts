/** The 30 free days a store gets when it starts its subscription. */
export const TRIAL_DAYS = 30;

/**
 * Whether a store may be open to the public: its subscription is on (free days included), or an admin recorded
 * a payment that has not run out. A store with neither can still be built, but stays a draft.
 */
export function hasBilling(store: {
  subscriptionStatus: string | null;
  paidUntil: Date | null;
}): boolean {
  return (
    store.subscriptionStatus === 'authorized' ||
    (store.paidUntil !== null && store.paidUntil > new Date())
  );
}
