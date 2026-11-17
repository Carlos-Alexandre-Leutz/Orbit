import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getCart } from '@/lib/cart';
import { formatPrice } from '@/lib/catalog';
import { imageSrc } from '@/lib/images';
import { announcementFor } from '@/lib/shipping';
import { getStoreCategories, type Store } from '@/lib/stores';
import { LogoutButton } from './LogoutButton';

/**
 * The top of a store, laid out like an ordinary online shop: a bar with the shipping offer, the search on the
 * left, the logo in the middle, the account and the cart on the right, and the categories underneath.
 */
export async function StoreHeader({ store }: { store: Store }) {
  const user = await getCurrentUser();
  const shops = user !== null && user.role !== 'ADMIN';
  const [categories, cart] = await Promise.all([
    getStoreCategories(store.slug),
    shops ? getCart(store.slug) : Promise.resolve(null),
  ]);
  const base = `/${store.slug}`;
  const offer = announcementFor(store, formatPrice);
  const first = (user?.name || user?.email || '').split(/[ @]/)[0];

  return (
    <header className="sticky top-0 z-30 border-b border-gray-700 bg-white">
      {offer && (
        <p
          className="px-4 py-1.5 text-center text-xs font-medium sm:text-sm"
          style={{
            backgroundColor: 'var(--store-color)',
            color: 'var(--store-on-color)',
          }}
        >
          {offer}
        </p>
      )}

      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-4 md:grid-cols-[1fr_auto_1fr]">
        <Link
          href={base}
          className="flex items-center gap-3 md:order-2 md:justify-center"
        >
          {store.logoImageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc(store.logoImageId)}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : null}
          <span className="text-xl font-bold tracking-wide">{store.name}</span>
        </Link>

        <div className="flex items-center justify-end gap-4 text-sm md:order-3">
          {user ? (
            <div className="hidden text-right leading-tight sm:block">
              <p>
                Hello, <strong>{first}</strong>
              </p>
              <p className="space-x-2">
                <Link href={`${base}/orders`} className="hover:underline">
                  My orders
                </Link>
                <Link href="/account" className="hover:underline">
                  My account
                </Link>
                {user.role === 'SELLER' ? (
                  <Link href="/panel" className="hover:underline">
                    Panel
                  </Link>
                ) : (
                  user.role === 'CUSTOMER' && (
                    <Link href="/sell" className="hover:underline">
                      Open a store
                    </Link>
                  )
                )}
              </p>
            </div>
          ) : (
            <div className="text-right leading-tight">
              <p className="text-gray-400">Welcome</p>
              <p>
                <Link
                  href={`${base}/login`}
                  className="font-semibold hover:underline"
                >
                  Sign in
                </Link>{' '}
                or{' '}
                <Link
                  href={`${base}/register`}
                  className="font-semibold hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          )}
          {user && <LogoutButton to={base} />}
          {user?.role !== 'ADMIN' && (
            <Link
              href={`${base}/cart`}
              aria-label={`Cart, ${cart?.itemCount ?? 0} items`}
              className="relative rounded-full border border-gray-600 p-2 hover:bg-gray-800"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6" />
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="17" cy="20" r="1.4" />
              </svg>
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold"
                style={{
                  backgroundColor: 'var(--store-color)',
                  color: 'var(--store-on-color)',
                }}
              >
                {cart?.itemCount ?? 0}
              </span>
            </Link>
          )}
        </div>

        <form
          method="get"
          action={base}
          role="search"
          className="col-span-2 flex md:order-1 md:col-span-1"
        >
          <input
            name="q"
            maxLength={100}
            aria-label="Search products"
            placeholder="What are you looking for?"
            className="w-full rounded-l border border-gray-600 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="submit"
            aria-label="Search"
            className="rounded-r border border-l-0 border-gray-600 px-3 hover:bg-gray-800"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        </form>
      </div>

      {categories.length > 0 && (
        <nav aria-label="Categories" className="border-t border-gray-700">
          <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 py-2 text-sm">
            <li>
              <Link
                href={base}
                className="whitespace-nowrap font-medium hover:underline"
              >
                All products
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`${base}?category=${encodeURIComponent(category.slug)}`}
                  className="whitespace-nowrap hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
