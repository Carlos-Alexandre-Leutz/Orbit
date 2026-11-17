import Link from 'next/link';
import { formatPrice } from '@/lib/catalog';
import { announcementFor } from '@/lib/shipping';
import type { Store } from '@/lib/stores';

export function StoreFooter({ store }: { store: Store }) {
  const base = `/${store.slug}`;
  const offer = announcementFor(store, formatPrice);
  return (
    <footer className="mt-10 border-t border-gray-700 bg-gray-900">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-2">
          <p className="text-base font-bold">{store.name}</p>
          {(store.tagline || store.description) && (
            <p className="text-gray-400">
              {store.tagline || store.description}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Customer service</p>
          {store.contactEmail && (
            <p>
              <a
                href={`mailto:${store.contactEmail}`}
                className="hover:underline"
              >
                {store.contactEmail}
              </a>
            </p>
          )}
          {store.contactPhone && <p>{store.contactPhone}</p>}
          {!store.contactEmail && !store.contactPhone && (
            <p className="text-gray-400">Contact details coming soon.</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="font-semibold">My shopping</p>
          <ul className="space-y-1 text-gray-400">
            <li>
              <Link href={`${base}/cart`} className="hover:underline">
                Cart
              </Link>
            </li>
            <li>
              <Link href={`${base}/orders`} className="hover:underline">
                My orders
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:underline">
                My account
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Delivery and payment</p>
          {offer && <p className="text-gray-400">{offer}</p>}
          {store.pickupEnabled && (
            <p className="text-gray-400">Pick up at the store is available.</p>
          )}
          <p className="text-gray-400">Card payments, in test mode.</p>
        </div>
      </div>
      <p className="border-t border-gray-700 px-4 py-3 text-center text-xs text-gray-400">
        {store.name} · Store powered by{' '}
        <Link href="/" className="underline">
          Orbit
        </Link>
        . Payments are simulated. ·{' '}
        <Link href="/terms" className="underline">
          Terms
        </Link>{' '}
        ·{' '}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
    </footer>
  );
}
