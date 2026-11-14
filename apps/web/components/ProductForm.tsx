'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  centsToInput,
  parsePriceToCents,
  type Category,
  type Product,
} from '@/lib/catalog';

const field = 'w-full rounded border border-gray-500 bg-transparent p-2';

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
      message?: string | string[];
    } | null;
    const message = data?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? 'Something went wrong. Try again.';
  } catch {
    return 'The server is not reachable. Try again.';
  }
}

export function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: Product;
}) {
  const router = useRouter();
  const editing = Boolean(product);
  const [sku, setSku] = useState(product?.sku ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(
    product ? centsToInput(product.priceCents) : '',
  );
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [categorySlug, setCategorySlug] = useState(
    product?.category.slug ?? categories[0]?.slug ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const priceCents = parsePriceToCents(price);
    if (priceCents === null) {
      setError(
        'Enter the price as 34.90 (no thousands separator, at most 2 decimals).',
      );
      return;
    }
    const units = Number(stock);
    if (!Number.isInteger(units) || units < 0) {
      setError('Stock must be a whole number, 0 or more.');
      return;
    }
    setBusy(true);
    const body = { name, description, priceCents, stock: units, categorySlug };
    const failure = editing
      ? await call('PATCH', `/api/bff/products/${product!.id}`, body)
      : await call('POST', '/api/bff/products', { sku, ...body });
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    router.push('/seller/products');
    router.refresh();
  }

  async function remove() {
    if (
      !product ||
      !window.confirm(`Remove "${product.name}"? It disappears from the store.`)
    )
      return;
    setBusy(true);
    const failure = await call('DELETE', `/api/bff/products/${product.id}`);
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    router.push('/seller/products');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <label className="block text-sm">
        SKU{' '}
        {editing && <span className="text-gray-400">(cannot be changed)</span>}
        <input
          className={field}
          value={sku}
          onChange={(e) => setSku(e.target.value.toUpperCase())}
          placeholder="KIT-900"
          pattern="[A-Z0-9][A-Z0-9_\-]{2,39}"
          title="3 to 40 characters: A-Z, 0-9, - or _"
          readOnly={editing}
          required
        />
      </label>
      <label className="block text-sm">
        Name
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
        />
      </label>
      <label className="block text-sm">
        Description
        <textarea
          className={field}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          Price (USD)
          <input
            className={field}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="34.90"
            required
          />
        </label>
        <label className="block text-sm">
          Stock
          <input
            className={field}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            inputMode="numeric"
            required
          />
        </label>
      </div>
      <label className="block text-sm">
        Category
        <select
          className={field}
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          required
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {editing ? 'Save changes' : 'Create product'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded border border-red-500 px-4 py-2 text-red-400 hover:bg-red-950 disabled:opacity-60"
          >
            Remove product
          </button>
        )}
      </div>
    </form>
  );
}
