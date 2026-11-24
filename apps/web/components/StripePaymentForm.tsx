'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/** The little of Stripe.js this form uses. Stripe.js is loaded from Stripe's own address, as Stripe requires. */
interface StripeElement {
  mount(target: HTMLElement): void;
  unmount(): void;
  destroy(): void;
  on(event: 'change', handler: (e: { error?: { message: string } }) => void): void;
}
interface StripeJs {
  elements(): { create(type: 'card', options: object): StripeElement };
  createPaymentMethod(input: object): Promise<{
    paymentMethod?: { id: string };
    error?: { message?: string };
  }>;
}
declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeJs;
  }
}

const STRIPE_JS = 'https://js.stripe.com/v3';

function loadStripeJs(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${STRIPE_JS}"]`,
    );
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () =>
      reject(new Error('Stripe could not be loaded.')),
    );
    if (!existing) {
      script.src = STRIPE_JS;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * The card payment screen. The card is typed into a field that Stripe itself draws, so the number goes from
 * the browser straight to Stripe and never touches our servers; we only receive an id for the card (`pm_...`)
 * and send it to the order's pay endpoint. A `pk_test_` key means Stripe's test mode (test cards only); a
 * `pk_live_` key charges real cards.
 */
export function StripePaymentForm({
  publishableKey,
  orderId,
  storeSlug,
  totalLabel,
}: {
  publishableKey: string;
  orderId: string;
  storeSlug: string;
  totalLabel: string;
}) {
  const router = useRouter();
  const testMode = publishableKey.startsWith('pk_test_');
  const mount = useRef<HTMLDivElement>(null);
  const stripe = useRef<StripeJs | null>(null);
  const card = useRef<StripeElement | null>(null);
  const [name, setName] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let element: StripeElement | null = null;
    let cancelled = false;
    loadStripeJs()
      .then(() => {
        if (cancelled || !mount.current || !window.Stripe) return;
        stripe.current = window.Stripe(publishableKey);
        element = stripe.current.elements().create('card', {
          hidePostalCode: true,
          style: { base: { fontSize: '16px', color: '#171717' } },
        });
        element.on('change', (e) => setError(e.error?.message ?? null));
        element.mount(mount.current);
        card.current = element;
        setReady(true);
      })
      .catch(() => setError('The payment form could not be loaded. Reload.'));
    return () => {
      cancelled = true;
      element?.destroy();
      card.current = null;
    };
  }, [publishableKey]);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe.current || !card.current) return;
    setBusy(true);
    setError(null);
    const created = await stripe.current.createPaymentMethod({
      type: 'card',
      card: card.current,
      billing_details: { name: name.trim() },
    });
    if (!created.paymentMethod) {
      setError(created.error?.message ?? 'Check the card details.');
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/bff/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: created.paymentMethod.id }),
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
      {testMode && (
        <p className="rounded bg-amber-900/40 p-3 text-sm text-amber-200">
          Test mode: no real money moves. Use the card 4242 4242 4242 4242, any
          future date and any 3 digits. To see a decline, use 4000 0000 0000
          0002.
        </p>
      )}
      <label className="block space-y-1 text-sm">
        Name on the card
        <input
          className="w-full rounded border border-gray-500 bg-transparent p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="cc-name"
          maxLength={80}
          required
        />
      </label>
      <div className="space-y-1 text-sm">
        <p>Card</p>
        <div
          ref={mount}
          className="rounded border border-gray-500 bg-white p-3"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !ready}
        className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy ? 'Paying...' : `Pay ${totalLabel}${testMode ? ' (test)' : ''}`}
      </button>
    </form>
  );
}
