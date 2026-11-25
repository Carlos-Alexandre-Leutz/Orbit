/**
 * Which addresses are pages of the site and which belong to a store. A store lives at `/<slug>`, so the first
 * part of an address is a store link unless it is one of these fixed pages. The API keeps the same words
 * (and a few more) out of the links a seller may choose, so the two can never meet.
 */
const SITE_PAGES = new Set([
  'account',
  'api',
  'admin',
  'assistant',
  'cart',
  'catalog',
  'checkout',
  'dashboard',
  'forgot-password',
  'login',
  'orders',
  'panel',
  'privacy',
  'register',
  'reset-password',
  'sell',
  'seller',
  'terms',
  '_next',
  'favicon.ico',
]);

const STORE_PRIVATE = new Set(['cart', 'checkout', 'orders']);
const SITE_PRIVATE = new Set(['account', 'dashboard', 'panel', 'seller']);

/** Pages that only make sense with a session: the cart, checkout and orders of a store, and the staff pages. */
export function needsSession(pathname: string): boolean {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (!first) return false;
  if (SITE_PRIVATE.has(first)) return true;
  return !SITE_PAGES.has(first) && STORE_PRIVATE.has(second ?? '');
}

/**
 * Where to send a visitor who must sign in to reach `pathname`. Inside a store the login is the store's own
 * page, so a customer signs in where they were shopping; everywhere else it is the platform login.
 */
export function loginUrl(pathname: string): string {
  const next = encodeURIComponent(pathname);
  const first = pathname.split('/').filter(Boolean)[0];
  if (first && !SITE_PAGES.has(first)) return `/${first}/login?next=${next}`;
  return `/login?next=${next}`;
}
