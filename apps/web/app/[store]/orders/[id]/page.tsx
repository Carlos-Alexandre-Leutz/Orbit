import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { OrderActions } from '@/components/OrderActions';
import { getCurrentUser } from '@/lib/auth';
import { formatPrice } from '@/lib/catalog';
import { getOrder } from '@/lib/orders';
import { getStore } from '@/lib/stores';
import { addressLines, formatWindow, statusLabel } from '@/lib/orders-shared';

export const metadata = { title: 'Order | Orbit' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({
  params,
}: {
  params: Promise<{ store: string; id: string }>;
}) {
  const { store: slug, id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}/orders/${id}`)}`);
  }
  if (!UUID.test(id)) notFound();
  const store = await getStore(slug);
  if (!store) notFound();
  const order = await getOrder(id);
  // An order is shown under the link of its own store only.
  if (!order || order.store.slug !== store.slug) notFound();

  const events = [
    ['Placed', order.createdAt],
    ['Paid', order.paidAt],
    ['Shipped', order.shippedAt],
    ['Delivered', order.deliveredAt],
    ['Cancelled', order.cancelledAt],
  ].filter((e): e is [string, string] => e[1] !== null);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
      <Link
        href={`/${store.slug}/orders`}
        className="text-sm text-blue-400 hover:underline"
      >
        All orders at {store.name}
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">Order {order.id.slice(0, 8)}</h1>
        <span
          data-testid="order-status"
          className="rounded bg-gray-700 px-3 py-1 text-sm"
        >
          {statusLabel(order.status)}
        </span>
      </div>

      <ul className="divide-y divide-gray-800 rounded border border-gray-700">
        {order.items.map((line) => (
          <li key={line.productId} className="flex justify-between gap-4 p-4">
            <span>
              {line.name}{' '}
              <span className="text-gray-400">
                x {line.quantity} at {formatPrice(line.priceCents)}
              </span>
            </span>
            <span className="font-bold">
              {formatPrice(line.lineTotalCents)}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between text-sm text-gray-400">
        <span>
          {order.deliveryMethod === 'PICKUP'
            ? 'Pickup at the store'
            : 'Shipping'}
        </span>
        <span>
          {order.shippingCents === 0
            ? 'Free'
            : formatPrice(order.shippingCents)}
        </span>
      </p>
      <p className="text-xl">
        Total: <strong>{formatPrice(order.totalCents)}</strong>
      </p>

      {order.status !== 'CANCELLED' && (
        <section className="space-y-1 rounded border border-gray-700 p-4 text-sm">
          <h2 className="font-semibold">
            {order.deliveryMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}
          </h2>
          {order.estimatedFrom && order.estimatedTo && order.status !== 'DELIVERED' && (
            <p>
              {order.deliveryMethod === 'PICKUP'
                ? 'Ready for pickup: '
                : 'Expected between: '}
              <strong>
                {formatWindow(order.estimatedFrom, order.estimatedTo)}
              </strong>
            </p>
          )}
          {order.trackingCode && <p>Tracking code: {order.trackingCode}</p>}
          {order.invoiceUrl && (
            <p>
              <a
                href={order.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-blue-400 hover:underline"
              >
                View the invoice (nota fiscal)
              </a>
            </p>
          )}
          {order.shippingAddress && (
            <p className="text-gray-400">
              {addressLines(order.shippingAddress).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      <ul className="space-y-1 text-sm text-gray-400">
        {events.map(([label, at]) => (
          <li key={label}>
            {label}: {new Date(at).toLocaleString('en-US')}
          </li>
        ))}
        {order.cancelledAt && order.refunded && (
          <li>The payment was refunded.</li>
        )}
      </ul>

      <p className="text-xs text-gray-500">
        Payments are simulated (test mode): no real money moved.
      </p>

      <OrderActions
        orderId={order.id}
        status={order.status}
        role={
          user.role === 'ADMIN' ||
          (user.role === 'SELLER' && user.store?.slug === store.slug)
            ? user.role
            : 'CUSTOMER'
        }
      />
    </main>
  );
}
