import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SimulatedPaymentForm } from '@/components/SimulatedPaymentForm';
import { MercadoPagoPaymentForm } from '@/components/MercadoPagoPaymentForm';
import { StripePaymentForm } from '@/components/StripePaymentForm';
import { formatPrice } from '@/lib/catalog';
import { getCurrentUser } from '@/lib/auth';
import { requireCustomer } from '@/lib/guard';
import { getOrder } from '@/lib/orders';
import { getStore } from '@/lib/stores';

export const metadata = { title: 'Payment | Orbit' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PayPage({
  params,
}: {
  params: Promise<{ store: string; id: string }>;
}) {
  const { store: slug, id } = await params;
  await requireCustomer(`/${slug}/orders/${id}/pay`);
  if (!UUID.test(id)) notFound();
  const store = await getStore(slug);
  if (!store) notFound();
  const order = await getOrder(id);
  if (!order || order.store.slug !== store.slug) notFound();
  // Only an order that waits for payment is paid here; any other goes back to its page.
  if (order.status !== 'PENDING_PAYMENT') {
    redirect(`/${store.slug}/orders/${order.id}`);
  }

  // The seller's own provider (ADR-008). Without one, a store outside production falls back to the platform's
  // Stripe test key (read at run time, not baked into the build) or to the simulated test cards.
  const user = await getCurrentUser();
  const total = formatPrice(order.totalCents);
  const ownProvider = store.paymentProvider && store.paymentPublicKey;
  const envKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
  const stripeKey =
    store.paymentProvider === 'stripe' && store.paymentPublicKey
      ? store.paymentPublicKey
      : !ownProvider && /^pk_(test|live)_[A-Za-z0-9]+$/.test(envKey)
        ? envKey
        : '';
  const closed = !ownProvider && process.env.NODE_ENV === 'production';

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-6 px-4 py-8">
      <Link
        href={`/${store.slug}/orders/${order.id}`}
        className="text-sm text-blue-400 hover:underline"
      >
        Back to the order
      </Link>
      <h1 className="text-2xl font-bold">Pay for your order</h1>
      <ul className="divide-y divide-gray-800 rounded-lg border border-gray-700">
        {order.items.map((line) => (
          <li key={line.productId} className="flex justify-between gap-4 p-3">
            <span>
              {line.name}{' '}
              <span className="text-gray-400">x {line.quantity}</span>
            </span>
            <span>{formatPrice(line.lineTotalCents)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-4 p-3 text-sm text-gray-400">
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
        </li>
        <li className="flex justify-between gap-4 p-3 text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(order.totalCents)}</span>
        </li>
      </ul>
      {closed ? (
        <p
          role="alert"
          className="rounded border border-gray-700 p-4 text-sm text-gray-400"
        >
          This store is not accepting payments yet. Please come back later.
        </p>
      ) : store.paymentProvider === 'mercadopago' && store.paymentPublicKey ? (
        <MercadoPagoPaymentForm
          publicKey={store.paymentPublicKey}
          orderId={order.id}
          storeSlug={store.slug}
          totalLabel={total}
          defaultEmail={user?.email ?? ''}
        />
      ) : stripeKey ? (
        <StripePaymentForm
          publishableKey={stripeKey}
          orderId={order.id}
          storeSlug={store.slug}
          totalLabel={total}
        />
      ) : (
        <SimulatedPaymentForm
          orderId={order.id}
          storeSlug={store.slug}
          totalLabel={total}
        />
      )}
    </main>
  );
}
