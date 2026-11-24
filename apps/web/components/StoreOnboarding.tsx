'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { slugFromName } from '@/lib/slug';
import { SELLING_MODES, TEMPLATES, type TemplateId } from '@/lib/templates';
import { TemplatePreview } from './TemplatePreview';

const STEPS = [
  'What do you want to sell?',
  'Pick a template',
  'Name your store',
];

/**
 * The first thing a new account does inside Orbit, in three steps like any store builder: what the seller wants
 * to do, which template to start from, and the name of the store (which gives it its link). Nothing is saved
 * until the last step; the new store is a draft that the owner publishes from the panel.
 */
export function StoreOnboarding({ origin }: { origin: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [modes, setModes] = useState<string[]>([]);
  const [template, setTemplate] = useState<TemplateId>('classic');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const link = edited ? slug : slugFromName(name);

  const toggle = (id: string) =>
    setModes((old) =>
      old.includes(id) ? old.filter((m) => m !== id) : [...old, id],
    );

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/session/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          template,
          sellingModes: modes,
          ...(link && { slug: link }),
        }),
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
  const primary =
    'rounded bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60';
  const secondary =
    'rounded border border-gray-500 px-5 py-2 hover:bg-gray-800';

  return (
    <div className="space-y-6">
      <ol className="flex gap-2 text-xs text-gray-400" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? 'step' : undefined}
            className={`flex-1 border-t-4 pt-1 ${i <= step ? 'border-green-600 text-gray-200' : 'border-gray-700'}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What do you want to sell?</h2>
          <p className="text-sm text-gray-400">
            Pick everything that fits. It only helps us set up your store; you
            can change your mind later.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {SELLING_MODES.map((mode) => (
              <li key={mode.id}>
                <label
                  className={`flex h-full cursor-pointer gap-3 rounded-lg border p-3 text-sm hover:bg-gray-900 ${modes.includes(mode.id) ? 'border-green-500 bg-gray-900' : 'border-gray-700'}`}
                >
                  <input
                    type="checkbox"
                    checked={modes.includes(mode.id)}
                    onChange={() => toggle(mode.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">{mode.label}</span>
                    <span className="text-gray-400">{mode.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button
              type="button"
              className={primary}
              onClick={() => setStep(1)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Pick a template</h2>
          <p className="text-sm text-gray-400">
            This is how your store looks to customers. You can switch any time
            in the store settings.
          </p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <label
                  className={`block h-full cursor-pointer space-y-2 rounded-lg border p-3 text-sm hover:bg-gray-900 ${template === t.id ? 'border-green-500 bg-gray-900' : 'border-gray-700'}`}
                >
                  <TemplatePreview id={t.id} color={t.color} />
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="template"
                      checked={template === t.id}
                      onChange={() => setTemplate(t.id)}
                    />
                    {t.label}
                  </span>
                  <span className="block text-gray-400">{t.description}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex justify-between">
            <button
              type="button"
              className={secondary}
              onClick={() => setStep(0)}
            >
              Back
            </button>
            <button
              type="button"
              className={primary}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <form onSubmit={create} className="space-y-4">
          <h2 className="text-xl font-semibold">Name your store</h2>
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
          <div className="flex justify-between">
            <button
              type="button"
              className={secondary}
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button type="submit" disabled={busy} className={primary}>
              {busy ? 'Creating...' : 'Create my store'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
