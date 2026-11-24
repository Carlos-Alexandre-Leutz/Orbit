'use client';

import { useState } from 'react';
import { imageSrc } from '@/lib/images';

/** A visible button for the file chooser: the browser's own one is invisible on the dark panel. */
const PICK_BUTTON =
  'inline-block cursor-pointer rounded border border-gray-500 px-3 py-1.5 text-sm hover:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500';

/** Sends one picture to the site, which stores it for the seller's store, and returns its id. */
async function upload(file: File): Promise<{ id?: string; error?: string }> {
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'The picture must be 2 MB or smaller.' };
  }
  try {
    const response = await fetch('/api/uploads', {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    const data = (await response.json().catch(() => null)) as {
      id?: string;
      message?: string;
    } | null;
    if (response.ok && data?.id) return { id: data.id };
    return { error: data?.message ?? 'The picture could not be uploaded.' };
  } catch {
    return { error: 'The server is not reachable. Try again.' };
  }
}

/** One picture (a logo, a cover): choose a file, see it, take it off. */
export function SingleImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await upload(file);
    setBusy(false);
    if (result.id) onChange(result.id);
    else setError(result.error ?? 'Upload failed.');
  }

  return (
    <div className="space-y-2 text-sm">
      <p>{label}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc(value)}
          alt={label}
          className="h-24 w-auto max-w-full rounded border border-gray-700 object-cover"
        />
      )}
      <div className="flex items-center gap-3">
        <label className={PICK_BUTTON}>
          {busy ? 'Uploading...' : value ? 'Change image' : 'Choose image'}
          <input
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/webp"
            aria-label={`${label} file`}
            disabled={busy}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-red-400 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** The gallery of a product: up to `max` pictures, the first one is the cover of the card. */
export function GalleryField({
  value,
  onChange,
  max = 6,
  label = 'Pictures (the first one is the cover)',
  hint,
  itemName = 'Product picture',
  limitText = `A product has at most ${max} pictures.`,
  addText = 'Add pictures',
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  itemName?: string;
  limitText?: string;
  addText?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const ids = [...value];
    for (const file of Array.from(files)) {
      if (ids.length >= max) {
        setError(limitText);
        break;
      }
      const result = await upload(file);
      if (result.id) ids.push(result.id);
      else setError(result.error ?? 'Upload failed.');
    }
    setBusy(false);
    onChange(ids);
  }

  return (
    <div className="space-y-2 text-sm">
      <p>{label}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      <ul className="flex flex-wrap gap-3">
        {value.map((id, index) => (
          <li key={id} className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc(id)}
              alt={`${itemName} ${index + 1}`}
              className="h-20 w-20 rounded border border-gray-700 object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((other) => other !== id))}
              className="block text-xs text-red-400 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {value.length < max && (
        <label className={PICK_BUTTON}>
          {busy ? 'Uploading...' : addText}
          <input
            type="file"
            multiple
            className="sr-only"
            accept="image/png,image/jpeg,image/webp"
            aria-label={addText}
            disabled={busy}
            onChange={(e) => void add(e.target.files)}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
