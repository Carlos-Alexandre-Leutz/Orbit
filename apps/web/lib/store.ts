/**
 * The store the pages shop in. Until the storefront moves under the store link (PBI-60) the web app
 * shows one store, the demo store; PBI-60 replaces this with the link in the page address.
 */
export const CURRENT_STORE = 'demo-store';

/** `?store=<link>` for the cart and order calls. */
export const STORE_QUERY = `store=${CURRENT_STORE}`;
