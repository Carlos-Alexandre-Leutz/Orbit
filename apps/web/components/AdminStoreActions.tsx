'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** What the admin does about one store. The API records who did it and when. */
export function AdminStoreActions({
  base,
  slug,
  suspended,
}: {
  base: string;
  slug: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function send(action: string, body: object, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/bff/${base}/stores/${encodeURIComponent(slug)}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (response.ok) {
        setMessage({ ok: true, text: done });
        setNote('');
        setReason('');
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

  const field = 'w-full rounded border border-gray-500 bg-transparent p-2';
  return (
    <div className="space-y-6">
      <form
        className="max-w-md space-y-3 rounded-lg border border-gray-700 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void send(
            'record-payment',
            { months, note },
            'Payment recorded.',
          );
        }}
      >
        <h2 className="font-semibold">Record a payment</h2>
        <p className="text-sm text-gray-400">
          The seller paid you outside Orbit. This only records it and moves the
          date; it does not charge anything.
        </p>
        <label className="block space-y-1 text-sm">
          Months paid
          <input
            type="number"
            min={1}
            max={12}
            className={field}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Note (optional)
          <input
            className={field}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Pix on the 16th"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Record payment
        </button>
      </form>

      {suspended ? (
        <div className="max-w-md space-y-3 rounded-lg border border-gray-700 p-4">
          <h2 className="font-semibold">This store is suspended</h2>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send('reactivate', {}, 'Store reactivated.')}
            className="rounded bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            Reactivate the store
          </button>
        </div>
      ) : (
        <form
          className="max-w-md space-y-3 rounded-lg border border-red-900 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              window.confirm(
                'Suspend this store? It disappears from the storefront and takes no new payments.',
              )
            ) {
              void send('suspend', { reason }, 'Store suspended.');
            }
          }}
        >
          <h2 className="font-semibold">Suspend the store</h2>
          <p className="text-sm text-gray-400">
            The store closes for buyers and takes no new payments. Nothing is
            deleted, and you can reactivate it.
          </p>
          <label className="block space-y-1 text-sm">
            Reason (kept in the record)
            <input
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={3}
              maxLength={200}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            Suspend
          </button>
        </form>
      )}
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
    </div>
  );
}
