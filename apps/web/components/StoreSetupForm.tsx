'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { slugFromName } from '@/lib/slug';

/**
 * The first thing a new account does inside Orbit: name the store. The name gives the store its link, which
 * is shown as it is typed, so the seller sees the address customers will use.
 */
export function StoreSetupForm({ origin }: { origin: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const link = edited ? slug : slugFromName(name);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/session/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...(link && { slug: link }) }),
      });
      if (response.ok) {
        router.replace('/panel');
        router.refresh();
        return;
      }
      const data = (await response.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message = data?.message;
      setError(
        (Array.isArray(message) ? message.join(', ') : message) ??
          'Something went wrong. Try again.',
      );
    } catch {
      setError('The server is not reachable. Try again.');
    }
    setBusy(false);
  }

  const field = 'w-full rounded border border-gray-500 bg-transparent p-2';
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1 text-sm">
        Store name
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
          placeholder="Loja do João"
          required
          autoFocus
        />
      </label>
      <label className="block space-y-1 text-sm">
        Store link
        <input
          className={field}
          value={link}
          onChange={(e) => {
            setEdited(true);
            setSlug(e.target.value.toLowerCase());
          }}
          maxLength={40}
          aria-describedby="store-link-preview"
        />
      </label>
      <p id="store-link-preview" className="text-sm text-gray-400">
        Your store will be at{' '}
        <span className="font-mono text-gray-200">
          {origin}/{link || 'your-store'}
        </span>
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
      >
        {busy ? 'Creating...' : 'Create my store'}
      </button>
    </form>
  );
}
