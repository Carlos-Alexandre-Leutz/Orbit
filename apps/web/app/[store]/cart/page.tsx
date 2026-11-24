import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyCartButton, LineControls } from '@/components/CartControls';
import { requireCustomer } from '@/lib/guard';
import { getStore } from '@/lib/stores';
import { formatPrice } from '@/lib/catalog';
import { getCart } from '@/lib/cart';
import { imageSrc } from '@/lib/images';

export const metadata = { title: 'Your cart | Orbit' };

export default async function CartPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store: slug } = await params;
  await requireCustomer(`/${slug}/cart`);
  const store = await getStore(slug);
  if (!store) notFound();
  const cart = await getCart(store.slug);

  if (!cart) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <p role="alert" className="text-red-400">
          Your cart could not be loaded. Try again in a moment.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Your cart at {store.name}</h1>

      {cart.items.length === 0 ? (
        <div className="space-y-3">
          <p>Your cart is empty.</p>
          <Link
            href={`/${store.slug}`}
            className="text-blue-400 hover:underline"
          >
            Browse {store.name}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
          <ul className="divide-y divide-gray-800 rounded-lg border border-gray-700">
            {cart.items.map((line) => (
              <li
                key={line.productId}
                className="flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="flex items-center gap-4">
                  {line.imageId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageSrc(line.imageId)}
                      alt=""
                      className="h-16 w-16 rounded object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-16 w-16 items-center justify-center rounded bg-gray-900 text-2xl text-gray-600"
                    >
                      {line.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <Link
                      href={`/${store.slug}/products/${line.productId}`}
                      className="font-semibold hover:underline"
                    >
                      {line.name}
                    </Link>
                    <p className="text-sm text-gray-400">
                      {formatPrice(line.priceCents)} each
                      {line.available ? '' : ' | '}
                      {!line.available && (
                        <span className="text-red-400">
                          {line.stock > 0
                            ? `Only ${line.stock} left`
                            : 'No longer available'}
                          : not counted in the total
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span
                    className={
                      line.available
                        ? 'font-bold'
                        : 'text-gray-500 line-through'
                    }
                  >
                    {formatPrice(line.lineTotalCents)}
                  </span>
                  <LineControls
                    store={store.slug}
                    productId={line.productId}
                    quantity={line.quantity}
                    stock={line.stock}
                    available={line.available}
                  />
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit space-y-4 rounded-lg border border-gray-700 p-4">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <p className="flex justify-between text-xl">
              <span>
                Total ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'})
              </span>
              <strong>{formatPrice(cart.totalCents)}</strong>
            </p>
            <p className="text-xs text-gray-400">
              Shipping is added at checkout.
            </p>
            <Link
              href={`/${store.slug}/checkout`}
              className="block rounded bg-blue-600 px-5 py-2 text-center font-semibold text-white hover:bg-blue-500"
            >
              Checkout
            </Link>
            <EmptyCartButton store={store.slug} />
          </aside>
        </div>
      )}
    </main>
  );
}
