import Link from 'next/link';
import {
  ConsentToggle,
  DeleteAccountButton,
} from '@/components/AccountControls';
import { getJoinedStores } from '@/lib/account';
import { formatPrice } from '@/lib/catalog';
import { requireCustomer } from '@/lib/guard';
import { getAllOrders } from '@/lib/orders';
import { statusLabel, type Order } from '@/lib/orders-shared';

export const metadata = { title: 'My account | Orbit' };

function groupByStore(orders: Order[]) {
  const groups = new Map<string, { name: string; orders: Order[] }>();
  for (const order of orders) {
    const group = groups.get(order.store.slug) ?? {
      name: order.store.name,
      orders: [],
    };
    group.orders.push(order);
    groups.set(order.store.slug, group);
  }
  return [...groups.entries()];
}

export default async function AccountPage() {
  const user = await requireCustomer('/account');
  const [orders, joined] = await Promise.all([
    getAllOrders(),
    getJoinedStores(),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">My account</h1>
        <p className="text-sm text-gray-400">
          {user.name || user.email}. One account for every store on Orbit.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My orders</h2>
        {orders === null ? (
          <p role="alert" className="text-red-400">
            Your orders could not be loaded. Try again in a moment.
          </p>
        ) : orders.length === 0 ? (
          <p>
            You have no orders yet.{' '}
            <Link href="/" className="text-blue-400 hover:underline">
              Find a store
            </Link>
          </p>
        ) : (
          groupByStore(orders).map(([slug, group]) => (
            <div key={slug} className="space-y-2">
              <h3 className="font-medium">
                <Link href={`/${slug}`} className="hover:underline">
                  {group.name}
                </Link>
              </h3>
              <ul className="divide-y divide-gray-800 rounded border border-gray-700">
                {group.orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/${slug}/orders/${order.id}`}
                      className="flex justify-between gap-3 p-3 hover:bg-gray-900"
                    >
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('en-US')}{' '}
                        · {statusLabel(order.status)}
                      </span>
                      <span>{formatPrice(order.totalCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Stores and messages</h2>
        {joined === null ? (
          <p role="alert" className="text-red-400">
            Your stores could not be loaded. Try again in a moment.
          </p>
        ) : joined.length === 0 ? (
          <p className="text-gray-400">You have not joined any store yet.</p>
        ) : (
          joined.map((entry) => (
            <ConsentToggle
              key={entry.store.slug}
              slug={entry.store.slug}
              storeName={entry.store.name}
              initial={entry.marketingConsent}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Delete my account</h2>
        <p className="text-sm text-gray-400">
          Your account is removed from every store. Past orders stay with the
          stores that sold them, without your name.
        </p>
        <DeleteAccountButton />
      </section>
    </main>
  );
}
