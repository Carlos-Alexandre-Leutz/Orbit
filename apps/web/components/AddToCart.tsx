'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { quantityChoices } from '@/lib/cart-shared';
import { STORE_QUERY } from '@/lib/store';

export function AddToCart({
  productId,
  stock,
  signedIn,
}: {
  productId: string;
  stock: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const choices = quantityChoices(stock);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  if (stock <= 0)
    return (
      <p className="text-sm text-gray-400">This product is out of stock.</p>
    );
  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/catalog/${productId}`)}`}
        className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Sign in to buy
      </Link>
    );
  }

  async function add() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/bff/cart/items?${STORE_QUERY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });
      if (response.ok) {
        setMessage({ ok: true, text: 'Added to your cart.' });
        router.refresh();
      } else {
        const data = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setMessage({
          ok: false,
          text: data?.message ?? 'Could not add it. Try again.',
        });
      }
    } catch {
      setMessage({
        ok: false,
        text: 'The server is not reachable. Try again.',
      });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <label className="text-sm">
          Quantity{' '}
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="rounded border border-gray-500 bg-transparent p-2"
          >
            {choices.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? 'Adding...' : 'Add to cart'}
        </button>
      </div>
      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={
            message.ok ? 'text-sm text-green-400' : 'text-sm text-red-400'
          }
        >
          {message.text}{' '}
          {message.ok && (
            <Link href="/cart" className="underline">
              View cart
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
