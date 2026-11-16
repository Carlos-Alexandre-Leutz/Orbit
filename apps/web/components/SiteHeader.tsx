import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getCart } from '@/lib/cart';
import { menuFor } from '@/lib/menu';
import { getStore } from '@/lib/stores';
import { LogoutButton } from './LogoutButton';

const ROLE_LABEL = {
  CUSTOMER: 'Customer',
  SELLER: 'Seller',
  ADMIN: 'Admin',
} as const;

/** `storeSlug` is the store whose page this is, when it is a store page; the menu follows it. */
export async function SiteHeader({ storeSlug }: { storeSlug?: string }) {
  const user = await getCurrentUser();
  const store = storeSlug ? await getStore(storeSlug) : null;
  const cart =
    user?.role === 'CUSTOMER' && store ? await getCart(store.slug) : null;
  return (
    <header className="border-b border-gray-700">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            Orbit Supply Co.
          </Link>
          <nav aria-label="Main" className="flex gap-4 text-sm">
            {menuFor(user?.role, {
              store,
              cartCount: cart?.itemCount ?? 0,
              ownStore: user?.store,
            }).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span>
                {user.name || user.email}{' '}
                <span className="rounded bg-gray-700 px-2 py-0.5 text-xs">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href={store ? `/${store.slug}/login` : '/login'}
                className="hover:underline"
              >
                Sign in
              </Link>
              <Link
                href={store ? `/${store.slug}/register` : '/sell'}
                className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
              >
                {store ? 'Sign up' : 'Create your store'}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
