'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { quantityChoices } from '@/lib/cart';

async function call(
  method: string,
  path: string,
  body?: object,
): Promise<string | null> {
  try {
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) init.body = JSON.stringify(body);
    const response = await fetch(path, init);
    if (response.ok) return null;
    const data = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    return data?.message ?? 'Something went wrong. Try again.';
  } catch {
    return 'The server is not reachable. Try again.';
  }
}

export function LineControls({
  productId,
  quantity,
  stock,
  available,
}: {
  productId: string;
  quantity: number;
  stock: number;
  available: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Keep the current quantity selectable even if the stock fell below it.
  const choices = Array.from(
    new Set([...quantityChoices(stock), quantity]),
  ).sort((a, b) => a - b);

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const failure = await action();
    setBusy(false);
    if (failure) setError(failure);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {available && (
          <select
            aria-label="Quantity"
            value={quantity}
            disabled={busy}
            onChange={(e) =>
              run(() =>
                call('PATCH', `/api/bff/cart/items/${productId}`, {
                  quantity: Number(e.target.value),
                }),
              )
            }
            className="rounded border border-gray-500 bg-transparent p-1"
          >
            {choices.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() => call('DELETE', `/api/bff/cart/items/${productId}`))
          }
          className="text-sm text-red-400 hover:underline disabled:opacity-60"
        >
          Remove
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function EmptyCartButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function empty() {
    if (!window.confirm('Remove everything from your cart?')) return;
    setBusy(true);
    await call('DELETE', '/api/bff/cart');
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={empty}
      disabled={busy}
      className="rounded border border-gray-500 px-3 py-1 text-sm hover:bg-gray-800 disabled:opacity-60"
    >
      Empty cart
    </button>
  );
}
