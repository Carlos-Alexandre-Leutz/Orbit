'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Where the Orbit owner edits the monthly price of a plan. It applies to new subscriptions. */
export function PlanPriceForm({
  base,
  planId,
  name,
  priceCents,
  currency,
}: {
  base: string;
  planId: string;
  name: string;
  priceCents: number;
  currency: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState((priceCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const cents = Math.round(Number(value.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents < 100 || cents > 1_000_000) {
      setMessage({ ok: false, text: 'Enter a price from 1.00 to 10000.00.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/bff/${base}/plans/${encodeURIComponent(planId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceCents: cents }),
        },
      );
      if (response.ok) {
        setMessage({ ok: true, text: 'Price saved.' });
        router.refresh();
      } else {
        const data = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const text = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message;
        setMessage({ ok: false, text: text ?? 'Something went wrong.' });
      }
    } catch {
      setMessage({ ok: false, text: 'The server is not reachable.' });
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={save}
      className="max-w-md space-y-3 rounded-lg border border-gray-700 p-4"
    >
      <h2 className="font-semibold">Monthly price: {name}</h2>
      <p className="text-sm text-gray-400">
        The new price applies to stores that start their subscription from now
        on. Subscriptions already running at Mercado Pago keep the price they
        started with.
      </p>
      <label className="block space-y-1 text-sm">
        Price per month ({currency})
        <input
          inputMode="decimal"
          className="w-full rounded border border-gray-500 bg-transparent p-2"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
      </label>
      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={
            message.ok ? 'text-sm text-green-400' : 'text-sm text-red-400'
          }
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy ? 'Saving...' : 'Save price'}
      </button>
    </form>
  );
}
