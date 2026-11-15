import { notFound, redirect } from 'next/navigation';
import { canManageProducts, getCurrentUser, type CurrentUser } from './auth';

/**
 * For pages only a seller or an admin may open. A visitor goes to the login page and comes back;
 * a customer gets "not found", as if the page did not exist. The API checks the role again on every write.
 */
export async function requireProductManager(
  path: string,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!canManageProducts(user.role)) notFound();
  return user;
}

/**
 * For pages only a customer may open (cart, checkout, the order list): only customers buy. A visitor goes to
 * the login page and comes back; a seller or admin gets "not found". The API refuses them again on every call.
 */
export async function requireCustomer(path: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (user.role !== 'CUSTOMER') notFound();
  return user;
}
