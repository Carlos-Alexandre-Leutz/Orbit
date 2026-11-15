import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { formatPrice } from '@/lib/catalog';
import { getOrders } from '@/lib/orders';
import { statusLabel } from '@/lib/orders-shared';

export const metadata = { title: 'Your orders | Orbit Supply Co.' };

export default async function OrdersPage() {
  if (!(await getCurrentUser())) redirect('/login?next=%2Forders');
  const orders = await getOrders();

  if (!orders) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <p role="alert" className="text-red-400">
          Your orders could not be loaded. Try again in a moment.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Your orders</h1>
      {orders.length === 0 ? (
        <div className="space-y-3">
          <p>You have no orders yet.</p>
          <Link href="/catalog" className="text-blue-400 hover:underline">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-800 rounded border border-gray-700">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-gray-900"
              >
                <span className="space-y-1">
                  <span className="block font-semibold">
                    Order {order.id.slice(0, 8)}
                  </span>
                  <span className="block text-sm text-gray-400">
                    {new Date(order.createdAt).toLocaleString('en-US')} |{' '}
                    {order.items.length} product
                    {order.items.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold">
                    {formatPrice(order.totalCents)}
                  </span>
                  <span className="block text-sm">
                    {statusLabel(order.status)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
