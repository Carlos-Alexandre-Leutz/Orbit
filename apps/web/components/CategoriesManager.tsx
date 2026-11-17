'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { OwnCategory } from '@/lib/panel';

async function call(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: object,
): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body && { body: JSON.stringify(body) }),
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

/** The categories of the store: add one, rename it, delete it when it has no products. */
export function CategoriesManager({
  categories,
}: {
  categories: OwnCategory[];
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<string | null>, done?: () => void) {
    setBusy(true);
    setError(null);
    const failure = await action();
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    done?.();
    router.refresh();
  }

  const field = 'rounded border border-gray-500 bg-transparent p-2 text-sm';
  return (
    <div className="max-w-2xl space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () => call('/api/bff/categories', 'POST', { name }),
            () => setName(''),
          );
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          className={`${field} flex-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category, for example Blouses"
          aria-label="New category"
          maxLength={80}
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
        >
          Add category
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {categories.length === 0 ? (
        <p className="text-gray-400">
          No categories yet. Add the ones you sell (pants, shoes, blouses...)
          and pick one when you create a product.
        </p>
      ) : (
        <ul className="divide-y divide-gray-800 rounded border border-gray-700">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              {editing === category.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(
                      () =>
                        call(`/api/bff/categories/${category.id}`, 'PATCH', {
                          name: draft,
                        }),
                      () => setEditing(null),
                    );
                  }}
                  className="flex flex-1 gap-2"
                >
                  <input
                    className={`${field} flex-1`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label={`Rename ${category.name}`}
                    maxLength={80}
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-sm hover:underline"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-gray-400">
                      {category.products} product
                      {category.products === 1 ? '' : 's'} on sale
                      {category.products === 0 &&
                        ' · hidden in the store until it has one'}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(category.id);
                        setDraft(category.name);
                      }}
                      className="text-blue-400 hover:underline"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete the category "${category.name}"?`,
                          )
                        ) {
                          void run(() =>
                            call(
                              `/api/bff/categories/${category.id}`,
                              'DELETE',
                            ),
                          );
                        }
                      }}
                      className="text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
