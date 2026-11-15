import Link from 'next/link';
import { listStores } from '@/lib/stores';

export const metadata = { title: 'Stores | Orbit' };

export default async function HomePage() {
  const stores = await listStores();
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Stores</h1>
      {stores === null ? (
        <p role="alert" className="text-red-400">
          The stores could not be loaded. Try again in a moment.
        </p>
      ) : stores.length === 0 ? (
        <p>There are no stores yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {stores.map((store) => (
            <li
              key={store.slug}
              className="rounded border border-gray-700 p-4 hover:border-gray-500"
            >
              <Link
                href={`/${store.slug}`}
                className="font-semibold hover:underline"
              >
                {store.name}
              </Link>
              <p className="text-sm text-gray-500">/{store.slug}</p>
              {store.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                  {store.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
