import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyCartButton, LineControls } from '@/components/CartControls';
import { getCurrentUser } from '@/lib/auth';
import { formatPrice } from '@/lib/catalog';
import { getCart } from '@/lib/cart';

export const metadata = { title: 'Your cart | Orbit Supply Co.' };

export default async function CartPage() {
  if (!(await getCurrentUser())) redirect('/login?next=%2Fcart');
  const cart = await getCart();

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
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Your cart</h1>

      {cart.items.length === 0 ? (
        <div className="space-y-3">
          <p>Your cart is empty.</p>
          <Link href="/catalog" className="text-blue-400 hover:underline">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-800 rounded border border-gray-700">
            {cart.items.map((line) => (
              <li
                key={line.productId}
                className="flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="space-y-1">
                  <Link
                    href={`/catalog/${line.productId}`}
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
                    productId={line.productId}
                    quantity={line.quantity}
                    stock={line.stock}
                    available={line.available}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <EmptyCartButton />
            <p className="text-xl">
              Total ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}):{' '}
              <strong>{formatPrice(cart.totalCents)}</strong>
            </p>
          </div>
        </>
      )}
    </main>
  );
}
