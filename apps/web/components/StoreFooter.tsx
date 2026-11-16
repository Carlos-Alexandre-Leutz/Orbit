import Link from 'next/link';
import type { Store } from '@/lib/stores';

export function StoreFooter({ store }: { store: Store }) {
  return (
    <footer className="mt-8 border-t border-gray-700">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4 py-6 text-sm text-gray-400">
        <div className="space-y-1">
          <p className="font-semibold text-gray-200">{store.name}</p>
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
        </div>
        <p>
          Store powered by{' '}
          <Link href="/" className="text-blue-400 hover:underline">
            Orbit
          </Link>
          . Payments are simulated.
        </p>
      </div>
    </footer>
  );
}
