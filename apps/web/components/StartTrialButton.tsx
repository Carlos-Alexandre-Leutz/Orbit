'use client';

import { useState } from 'react';

/** Takes the seller to Mercado Pago's own page, where the card is registered. Orbit never sees the card. */
export function StartTrialButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/bff/billing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string | string[];
      } | null;
      if (response.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      const message = Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message;
      setError(message ?? 'Could not start. Try again.');
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
        onClick={() => void start()}
        className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy ? 'Opening Mercado Pago...' : label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
