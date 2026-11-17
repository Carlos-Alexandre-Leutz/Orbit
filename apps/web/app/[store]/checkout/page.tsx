import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlaceOrderButton } from '@/components/PlaceOrderButton';
import { requireCustomer } from '@/lib/guard';
import { getStore } from '@/lib/stores';
import { getCart } from '@/lib/cart';
import { getSavedAddresses } from '@/lib/orders';
import { formatPrice } from '@/lib/catalog';

export const metadata = { title: 'Checkout | Orbit' };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store: slug } = await params;
  await requireCustomer(`/${slug}/checkout`);
  const store = await getStore(slug);
  if (!store) notFound();
  const cart = await getCart(store.slug);
  const savedAddresses = await getSavedAddresses();

  if (!cart) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <p role="alert" className="text-red-400">
          Your cart could not be loaded. Try again in a moment.
        </p>
      </main>
    );
  }
  const lines = cart.items.filter((line) => line.available);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Checkout at {store.name}</h1>
      {lines.length === 0 ? (
        <div className="space-y-3">
          <p>There is nothing to order: your cart has no available items.</p>
          <Link
            href={`/${store.slug}/cart`}
            className="text-blue-400 hover:underline"
          >
            Back to the cart
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-800 rounded border border-gray-700">
            {lines.map((line) => (
              <li
                key={line.productId}
                className="flex justify-between gap-4 p-4"
              >
                <span>
                  {line.name}{' '}
                  <span className="text-gray-400">x {line.quantity}</span>
                </span>
                <span className="font-bold">
                  {formatPrice(line.lineTotalCents)}
                </span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between text-sm text-gray-400">
            <span>Items</span>
            <span>{formatPrice(cart.totalCents)}</span>
          </p>
          <p className="text-sm text-gray-400">
            Payments run in test mode: no real money moves. You pay on the next
            page. Stock is reserved when you place the order.
          </p>
          <PlaceOrderButton
            store={store.slug}
            itemsCents={cart.totalCents}
            savedAddresses={savedAddresses}
            rules={{
              shippingFlatCents: store.shippingFlatCents,
              freeShippingOverCents: store.freeShippingOverCents,
              pickupEnabled: store.pickupEnabled,
              handlingDays: store.handlingDays,
              deliveryDaysMin: store.deliveryDaysMin,
              deliveryDaysMax: store.deliveryDaysMax,
              deliveryByState: store.deliveryByState,
            }}
          />
        </>
      )}
    </main>
  );
}
