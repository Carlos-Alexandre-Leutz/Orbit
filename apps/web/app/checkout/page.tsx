import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlaceOrderButton } from '@/components/PlaceOrderButton';
import { getCurrentUser } from '@/lib/auth';
import { getCart } from '@/lib/cart';
import { formatPrice } from '@/lib/catalog';

export const metadata = { title: 'Checkout | Orbit Supply Co.' };

export default async function CheckoutPage() {
  if (!(await getCurrentUser())) redirect('/login?next=%2Fcheckout');
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
  const lines = cart.items.filter((line) => line.available);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {lines.length === 0 ? (
        <div className="space-y-3">
          <p>There is nothing to order: your cart has no available items.</p>
          <Link href="/cart" className="text-blue-400 hover:underline">
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
          <p className="text-xl">
            Total: <strong>{formatPrice(cart.totalCents)}</strong>
          </p>
          <p className="text-sm text-gray-400">
            Payments run in test mode: no real money moves. You pay on the next
            page. Stock is reserved when you place the order.
          </p>
          <PlaceOrderButton />
        </>
      )}
    </main>
  );
}
