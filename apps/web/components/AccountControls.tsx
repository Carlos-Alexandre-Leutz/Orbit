'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** The marketing choice for one store: saved at once, and only for that store. */
export function ConsentToggle({
  slug,
  storeName,
  initial,
}: {
  slug: string;
  storeName: string;
  initial: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function change(value: boolean) {
    setError(null);
    setChecked(value);
    const response = await fetch(
      `/api/bff/account/stores/${encodeURIComponent(slug)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketingConsent: value }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setChecked(!value);
      setError('Could not save your choice. Try again.');
    }
  }

  return (
    <div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => void change(e.target.checked)}
        />
        {storeName} may send me news and offers
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeleteAccountButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (
      !window.confirm(
        'Delete your account? You will no longer be able to sign in. Your past orders stay with the stores, without your name.',
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch('/api/session/delete-account', {
      method: 'POST',
    }).catch(() => null);
    if (!response?.ok) {
      setError('The account could not be deleted. Try again.');
      setBusy(false);
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        className="rounded border border-red-500 px-3 py-1 text-sm text-red-400 hover:bg-red-950 disabled:opacity-60"
      >
        {busy ? 'Deleting...' : 'Delete my account'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
