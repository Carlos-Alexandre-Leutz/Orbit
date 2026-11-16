'use client';

import { useState } from 'react';
import { imageSrc } from '@/lib/images';

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
  value,
  onChange,
}: {
  label: string;
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
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc(value)}
          alt={label}
          className="h-24 w-auto max-w-full rounded border border-gray-700 object-cover"
        />
      )}
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={`${label} file`}
          disabled={busy}
          onChange={(e) => void pick(e.target.files?.[0])}
        />
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
      {busy && <p className="text-gray-400">Uploading...</p>}
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
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
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
        setError(`A product has at most ${max} pictures.`);
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
      <p>Pictures (the first one is the cover)</p>
      <ul className="flex flex-wrap gap-3">
        {value.map((id, index) => (
          <li key={id} className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc(id)}
              alt={`Product picture ${index + 1}`}
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
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          aria-label="Add pictures"
          disabled={busy}
          onChange={(e) => void add(e.target.files)}
        />
      )}
      {busy && <p className="text-gray-400">Uploading...</p>}
      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
