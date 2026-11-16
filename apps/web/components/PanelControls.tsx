'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function call(
  path: string,
  method: 'POST' | 'PATCH',
  body?: object,
): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    if (response.ok) return null;
    const data = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = data?.message;
    return (
      (Array.isArray(message) ? message.join(', ') : message) ??
      'Something went wrong. Try again.'
    );
  } catch {
    return 'The server is not reachable. Try again.';
  }
}

/** Ship a paid order, deliver a shipped one. The API decides whether the step is allowed. */
export function ShipDeliverButton({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action =
    status === 'PAID' ? 'ship' : status === 'SHIPPED' ? 'deliver' : null;
  if (!action) return null;

  async function run() {
    setBusy(true);
    setError(null);
    const failure = await call(`/api/bff/orders/${orderId}/${action}`, 'POST');
    setBusy(false);
    if (failure) setError(failure);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy
          ? '...'
          : action === 'ship'
            ? 'Mark as shipped'
            : 'Mark as delivered'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function StoreSettingsForm({
  initial,
}: {
  initial: { name: string; description: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const failure = await call('/api/bff/stores/mine', 'PATCH', {
      name,
      description,
    });
    setBusy(false);
    setMessage(
      failure ? { ok: false, text: failure } : { ok: true, text: 'Saved.' },
    );
    if (!failure) router.refresh();
  }

  const field = 'w-full rounded border border-gray-500 bg-transparent p-2';
  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <label className="block space-y-1 text-sm">
        Store name
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
      </label>
      <label className="block space-y-1 text-sm">
        Description
        <textarea
          className={field}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
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
        className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
      >
        {busy ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
