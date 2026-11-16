'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

/**
 * Places the order from the cart. The idempotency key is made once per page, so a double click or a retry after
 * a lost answer gives the same order instead of a second one.
 */
export function PlaceOrderButton({ store }: { store: string }) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function place() {
    key.current ??= crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/bff/orders?store=${encodeURIComponent(store)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': key.current,
          },
          body: '{}',
        },
      );
      const data = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;
      if (response.ok && data?.id) {
        router.push(`/${store}/orders/${data.id}/pay`);
        // The cart count in the header belongs to the layout, which a plain navigation keeps as it was.
        router.refresh();
        return;
      }
      // A refused order was not created, so the same key can be used again once the cart is fixed.
      setError(data?.message ?? 'Could not place the order. Try again.');
    } catch {
      setError('The server is not reachable. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={place}
        className="rounded bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {busy ? 'Placing order...' : 'Place order'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
