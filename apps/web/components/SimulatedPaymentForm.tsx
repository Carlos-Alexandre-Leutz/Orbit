'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TEST_CARDS } from '@/lib/orders-shared';

/**
 * The simulated payment screen. No card number is ever typed: the customer picks one of the test payment
 * methods, and the payment provider behind the port (a fake one, or Stripe in test mode) answers.
 */
export function SimulatedPaymentForm({
  orderId,
  storeSlug,
  totalLabel,
}: {
  orderId: string;
  storeSlug: string;
  totalLabel: string;
}) {
  const router = useRouter();
  const [card, setCard] = useState<string>(TEST_CARDS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/bff/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: card }),
      });
      if (response.ok) {
        router.replace(`/${storeSlug}/orders/${orderId}`);
        router.refresh();
        return;
      }
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(
        data?.message ?? 'The payment did not go through. Try another card.',
      );
    } catch {
      setError('The server is not reachable. Try again.');
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={pay}
      className="space-y-4 rounded-lg border border-gray-700 p-4"
    >
      <p className="rounded bg-amber-900/40 p-3 text-sm text-amber-200">
        Simulated payment: no real money moves and no card number is asked.
        Choose a test card to see how the store reacts.
      </p>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-gray-400">Test card</legend>
        {TEST_CARDS.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded border border-gray-700 p-3 text-sm hover:bg-gray-900"
          >
            <input
              type="radio"
              name="card"
              value={option.id}
              checked={card === option.id}
              onChange={() => setCard(option.id)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy ? 'Paying...' : `Pay ${totalLabel} (test)`}
      </button>
    </form>
  );
}
