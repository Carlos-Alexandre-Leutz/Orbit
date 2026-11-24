import { notFound, redirect } from 'next/navigation';
import { loginUrl } from './routes';
import { canManageProducts, getCurrentUser, type CurrentUser } from './auth';

/**
 * For pages only a seller or an admin may open. A visitor goes to the login page and comes back;
 * a customer gets "not found", as if the page did not exist. The API checks the role again on every write.
 */
export async function requireProductManager(
  path: string,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(path));
  if (!canManageProducts(user.role)) notFound();
  return user;
}

/**
 * For the pages of shopping (cart, checkout, the order list): any account shops, a seller included, because one
 * Orbit account can own a store and buy in others. A visitor goes to the login page and comes back; an admin
 * gets "not found". The API refuses an admin again on every call.
 */
export async function requireCustomer(path: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(path));
  if (user.role === 'ADMIN') notFound();
  return user;
}

/**
 * For the seller panel: only a seller opens it, and everything in it is about the seller's own store. A visitor goes
 * to the login page and comes back; anyone else gets "not found". The API checks the role again on every call.
 */
export async function requireSeller(path: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(path));
  // An account that only shops has no panel yet: /sell lets it name a store.
  if (user.role === 'CUSTOMER') redirect('/sell');
  if (user.role !== 'SELLER') notFound();
  return user;
}

/**
 * For the Orbit owner's area: only an admin opens it. Everyone else, a visitor included, gets "not found", as
 * if the area did not exist. The API checks the role again on every call.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  // A visitor is not sent to the login page: that would show the area exists. Same answer for everyone.
  if (!user || user.role !== 'ADMIN') notFound();
  return user;
}
