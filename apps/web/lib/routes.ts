/**
 * Which addresses are pages of the site and which belong to a store. A store lives at `/<slug>`, so the first
 * part of an address is a store link unless it is one of these fixed pages. The API keeps the same words
 * (and a few more) out of the links a seller may choose, so the two can never meet.
 */
const SITE_PAGES = new Set([
  'api',
  'admin',
  'cart',
  'catalog',
  'checkout',
  'dashboard',
  'forgot-password',
  'login',
  'orders',
  'register',
  'reset-password',
  'seller',
  '_next',
  'favicon.ico',
]);

const STORE_PRIVATE = new Set(['cart', 'checkout', 'orders']);
const SITE_PRIVATE = new Set(['dashboard', 'seller', 'admin']);

/** Pages that only make sense with a session: the cart, checkout and orders of a store, and the staff pages. */
export function needsSession(pathname: string): boolean {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (!first) return false;
  if (SITE_PRIVATE.has(first)) return true;
  return !SITE_PAGES.has(first) && STORE_PRIVATE.has(second ?? '');
}
