'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { centsToInput, parsePriceToCents } from '@/lib/catalog';
import {
  HIGHLIGHT_PRESETS,
  MAX_HIGHLIGHTS,
  type Highlight,
} from '@/lib/highlights';
import { safeColor } from '@/lib/images';
import { BRAZIL_STATES } from '@/lib/shipping';
import type { OwnStore } from '@/lib/panel';
import { GalleryField, SingleImageField } from './ImageUpload';
import { TemplatePreview } from './TemplatePreview';
import { TEMPLATES, templateOf } from '@/lib/templates';

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
  const [tracking, setTracking] = useState('');
  const action =
    status === 'PAID' ? 'ship' : status === 'SHIPPED' ? 'deliver' : null;
  if (!action) return null;

  async function run() {
    setBusy(true);
    setError(null);
    const failure = await call(
      `/api/bff/orders/${orderId}/${action}`,
      'POST',
      action === 'ship' && tracking.trim()
        ? { trackingCode: tracking.trim() }
        : undefined,
    );
    setBusy(false);
    if (failure) setError(failure);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      {action === 'ship' && (
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Tracking code (optional)"
          maxLength={60}
          aria-label="Tracking code"
          className="w-44 rounded border border-gray-500 bg-transparent p-1 text-sm"
        />
      )}
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

/** Same rules as the API: an e-mail with a real domain ending, a phone of 8 to 15 digits, or empty. */
function contactProblem(email: string, phone: string): string | null {
  if (email && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
    return 'Enter a valid contact e-mail, such as name@example.com.';
  }
  const digits = phone.replace(/\D/g, '').length;
  if (
    phone &&
    (!/^\+?[\d\s().-]+$/.test(phone) || digits < 8 || digits > 15)
  ) {
    return 'Enter a valid contact phone with 8 to 15 digits, such as +55 48 99999-9999.';
  }
  return null;
}

export function StoreSettingsForm({ initial }: { initial: OwnStore }) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: initial.name,
    description: initial.description,
    tagline: initial.tagline,
    primaryColor: safeColor(initial.primaryColor),
    contactEmail: initial.contactEmail,
    contactPhone: initial.contactPhone,
  });
  const [template, setTemplate] = useState(templateOf(initial.template));
  const [logo, setLogo] = useState<string | null>(initial.logoImageId);
  const [banners, setBanners] = useState<string[]>(
    initial.bannerImageIds ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const set = (key: keyof typeof values) => (value: string) =>
    setValues((old) => ({ ...old, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = contactProblem(values.contactEmail, values.contactPhone);
    if (invalid) {
      setMessage({ ok: false, text: invalid });
      return;
    }
    setBusy(true);
    setMessage(null);
    const failure = await call('/api/bff/stores/mine', 'PATCH', {
      ...values,
      template,
      logoImageId: logo,
      bannerImageIds: banners,
    });
    setBusy(false);
    setMessage(
      failure ? { ok: false, text: failure } : { ok: true, text: 'Saved.' },
    );
    if (!failure) router.refresh();
  }

  const field = 'w-full rounded border border-gray-500 bg-transparent p-2';
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <label className="block space-y-1 text-sm">
        Store name
        <input
          className={field}
          value={values.name}
          onChange={(e) => set('name')(e.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
      </label>
      <label className="block space-y-1 text-sm">
        Tagline
        <input
          className={field}
          value={values.tagline}
          onChange={(e) => set('tagline')(e.target.value)}
          maxLength={120}
          placeholder="One line that says what you sell"
        />
      </label>
      <label className="block space-y-1 text-sm">
        Description
        <textarea
          className={field}
          rows={4}
          value={values.description}
          onChange={(e) => set('description')(e.target.value)}
          maxLength={500}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        Main color
        <input
          type="color"
          value={values.primaryColor}
          onChange={(e) => set('primaryColor')(e.target.value)}
          aria-label="Main color"
        />
        <span className="font-mono text-gray-400">{values.primaryColor}</span>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm">Template</legend>
        <ul className="grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <label
                className={`block h-full cursor-pointer space-y-2 rounded-lg border p-2 text-sm hover:bg-gray-900 ${template === t.id ? 'border-green-500 bg-gray-900' : 'border-gray-700'}`}
              >
                <TemplatePreview id={t.id} color={values.primaryColor} />
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="template"
                    checked={template === t.id}
                    onChange={() => setTemplate(t.id)}
                  />
                  {t.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <SingleImageField label="Logo" value={logo} onChange={setLogo} />
      <GalleryField
        label="Banners (up to 5)"
        hint="Shown at the top of your store, in this order. With more than one, they turn into a carousel. A wide picture works best, for example 1600 × 500 pixels (PNG, JPEG or WebP, up to 2 MB each)."
        itemName="Banner"
        limitText="A store has at most 5 banners."
        addText="Add banners"
        value={banners}
        onChange={setBanners}
        max={5}
      />
      <label className="block space-y-1 text-sm">
        Contact e-mail
        <input
          type="email"
          autoComplete="email"
          className={field}
          value={values.contactEmail}
          onChange={(e) => set('contactEmail')(e.target.value)}
          maxLength={120}
        />
      </label>
      <label className="block space-y-1 text-sm">
        Contact phone
        <input
          type="tel"
          autoComplete="tel"
          placeholder="+55 48 99999-9999"
          className={field}
          value={values.contactPhone}
          onChange={(e) => set('contactPhone')(e.target.value)}
          maxLength={30}
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

/** Publish the store (it becomes visible at its link) or take it back to a draft. */
export function PublishButton({ published }: { published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPlan, setNeedsPlan] = useState(false);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/bff/stores/mine', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !published }),
      });
      if (response.status === 402) {
        setNeedsPlan(true);
      } else if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = data?.message;
        setError(
          (Array.isArray(message) ? message.join(', ') : message) ??
            'Something went wrong. Try again.',
        );
      }
    } catch {
      setError('The server is not reachable. Try again.');
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      {needsPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-trial-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border border-gray-600 bg-gray-900 p-6">
            <h2 id="start-trial-title" className="text-lg font-semibold">
              Start your free trial to open your store
            </h2>
            <p className="text-sm text-gray-300">
              To open your store to the public you need an active plan. Start
              your free trial in Billing: nothing is charged during the free
              days, and you can cancel before they end.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNeedsPlan(false)}
                className="rounded border border-gray-500 px-4 py-2 text-sm hover:bg-gray-800"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => router.push('/panel/billing')}
                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Start free trial
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={
          published
            ? 'rounded border border-gray-500 px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-60'
            : 'rounded bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60'
        }
      >
        {busy
          ? '...'
          : published
            ? 'Unpublish (back to draft)'
            : 'Publish store'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shipping: a flat fee, free above a total, and pickup at the store. */
export function ShippingForm({
  initial,
}: {
  initial: {
    shippingFlatCents: number;
    freeShippingOverCents: number | null;
    pickupEnabled: boolean;
    handlingDays: number;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
    deliveryByState: Record<string, { min: number; max: number }>;
  };
}) {
  const router = useRouter();
  // One row per state the seller priced apart from the general days.
  const [byState, setByState] = useState(
    Object.entries(initial.deliveryByState ?? {}).map(([state, t]) => ({
      state,
      min: String(t.min),
      max: String(t.max),
    })),
  );
  // The same defaults as the database, in case the API answers without them.
  const [handling, setHandling] = useState(String(initial.handlingDays ?? 1));
  const [daysMin, setDaysMin] = useState(String(initial.deliveryDaysMin ?? 3));
  const [daysMax, setDaysMax] = useState(String(initial.deliveryDaysMax ?? 7));
  const [flat, setFlat] = useState(centsToInput(initial.shippingFlatCents));
  const [freeOver, setFreeOver] = useState(
    initial.freeShippingOverCents === null
      ? ''
      : centsToInput(initial.freeShippingOverCents),
  );
  const [pickup, setPickup] = useState(initial.pickupEnabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const flatCents = parsePriceToCents(flat || '0');
    const freeCents =
      freeOver.trim() === '' ? null : parsePriceToCents(freeOver);
    if (flatCents === null || (freeOver.trim() !== '' && freeCents === null)) {
      setMessage({
        ok: false,
        text: 'Enter amounts like 9.90 (no thousands separator, at most 2 decimals).',
      });
      return;
    }
    const days = [handling, daysMin, daysMax].map((v) => Number(v.trim()));
    if (days.some((n) => !Number.isInteger(n) || n < 0)) {
      setMessage({ ok: false, text: 'Days must be whole numbers, 0 or more.' });
      return;
    }
    if (days[1] > days[2]) {
      setMessage({
        ok: false,
        text: 'The shortest trip cannot be longer than the longest.',
      });
      return;
    }
    const table: Record<string, { min: number; max: number }> = {};
    for (const row of byState) {
      const min = Number(row.min.trim());
      const max = Number(row.max.trim());
      if (!row.state || !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || min > max) {
        setMessage({
          ok: false,
          text: 'Each state needs whole days, with the shortest not above the longest.',
        });
        return;
      }
      if (table[row.state]) {
        setMessage({ ok: false, text: `${row.state} is listed twice.` });
        return;
      }
      table[row.state] = { min, max };
    }
    setBusy(true);
    const failure = await call('/api/bff/stores/mine', 'PATCH', {
      deliveryByState: table,
      shippingFlatCents: flatCents,
      freeShippingOverCents: freeCents,
      pickupEnabled: pickup,
      handlingDays: days[0],
      deliveryDaysMin: days[1],
      deliveryDaysMax: days[2],
    });
    setBusy(false);
    setMessage(
      failure ? { ok: false, text: failure } : { ok: true, text: 'Saved.' },
    );
    if (!failure) router.refresh();
  }

  const field = 'w-40 rounded border border-gray-500 bg-transparent p-2';
  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <label className="block space-y-1 text-sm">
        Shipping fee (USD, 0 for free shipping)
        <input
          className={field}
          value={flat}
          onChange={(e) => setFlat(e.target.value)}
          inputMode="decimal"
        />
      </label>
      <label className="block space-y-1 text-sm">
        Free shipping for orders from (USD, leave empty for never)
        <input
          className={field}
          value={freeOver}
          onChange={(e) => setFreeOver(e.target.value)}
          inputMode="decimal"
          placeholder="50.00"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pickup}
          onChange={(e) => setPickup(e.target.checked)}
        />
        Customers may pick their order up at the store (no shipping fee)
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-gray-400">
          Delivery time (business days)
        </legend>
        <div className="flex flex-wrap gap-3">
          {[
            ['Days to prepare an order', handling, setHandling],
            ['Shortest trip', daysMin, setDaysMin],
            ['Longest trip', daysMax, setDaysMax],
          ].map(([label, value, set]) => (
            <label key={label as string} className="space-y-1 text-sm">
              {label as string}
              <input
                className="block w-32 rounded border border-gray-500 bg-transparent p-2"
                value={value as string}
                onChange={(e) =>
                  (set as (v: string) => void)(e.target.value)
                }
                inputMode="numeric"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          The customer is promised: preparation plus the shortest trip, up to
          preparation plus the longest. Weekends are not counted.
        </p>
        <p className="pt-2 text-sm text-gray-400">
          By destination state: a state listed here uses its own trip days
          instead of the general ones above (for example, a store in Acre takes
          longer to reach Santa Catarina than another store in Acre).
        </p>
        {byState.map((row, index) => (
          <div key={index} className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              State
              <select
                className="block rounded border border-gray-500 bg-black p-2"
                value={row.state}
                onChange={(e) =>
                  setByState(
                    byState.map((r, i) =>
                      i === index ? { ...r, state: e.target.value } : r,
                    ),
                  )
                }
              >
                <option value="">Choose</option>
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
            {(['min', 'max'] as const).map((side) => (
              <label key={side} className="space-y-1 text-sm">
                {side === 'min' ? 'Shortest trip' : 'Longest trip'}
                <input
                  className="block w-28 rounded border border-gray-500 bg-transparent p-2"
                  value={row[side]}
                  inputMode="numeric"
                  onChange={(e) =>
                    setByState(
                      byState.map((r, i) =>
                        i === index ? { ...r, [side]: e.target.value } : r,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => setByState(byState.filter((_, i) => i !== index))}
              className="rounded border border-gray-500 px-3 py-2 text-sm hover:bg-gray-800"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setByState([...byState, { state: '', min: '', max: '' }])
          }
          className="rounded border border-gray-500 px-3 py-2 text-sm hover:bg-gray-800"
        >
          Add a state
        </button>
      </fieldset>
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

/** The reassurances shown under the banner: tick up to four, and rewrite the text of each. */
export function HighlightsForm({ initial }: { initial: Highlight[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Highlight[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const has = (id: string) => chosen.some((h) => h.id === id);
  const toggle = (id: string) =>
    setChosen((old) =>
      old.some((h) => h.id === id)
        ? old.filter((h) => h.id !== id)
        : [...old, { id }],
    );
  const setText = (id: string, text: string) =>
    setChosen((old) => old.map((h) => (h.id === id ? { ...h, text } : h)));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const failure = await call('/api/bff/stores/mine', 'PATCH', {
      highlights: chosen.map((h) =>
        h.text?.trim() ? { id: h.id, text: h.text.trim() } : { id: h.id },
      ),
    });
    setBusy(false);
    setMessage(
      failure ? { ok: false, text: failure } : { ok: true, text: 'Saved.' },
    );
    if (!failure) router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <ul className="space-y-3">
        {HIGHLIGHT_PRESETS.map((preset) => {
          const on = has(preset.id);
          const full = !on && chosen.length >= MAX_HIGHLIGHTS;
          const current = chosen.find((h) => h.id === preset.id);
          return (
            <li
              key={preset.id}
              className={`rounded-lg border p-3 ${on ? 'border-green-500' : 'border-gray-700'}`}
            >
              <label
                className={`flex items-center gap-3 text-sm ${full ? 'opacity-50' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={full}
                  onChange={() => toggle(preset.id)}
                />
                <span aria-hidden="true" className="text-xl">
                  {preset.icon}
                </span>
                <span className="font-medium">{preset.title}</span>
              </label>
              {on && (
                <input
                  className="mt-2 w-full rounded border border-gray-500 bg-transparent p-2 text-sm"
                  value={current?.text ?? ''}
                  onChange={(e) => setText(preset.id, e.target.value)}
                  placeholder={preset.text}
                  maxLength={80}
                  aria-label={`Text for ${preset.title}`}
                />
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-gray-400">
        {chosen.length} of {MAX_HIGHLIGHTS} chosen. Leave the text empty to use
        the suggested one.
      </p>
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

/** The seller adds, changes or removes the link to the tax invoice (nota fiscal) of a paid order. */
export function InvoiceField({
  orderId,
  initial,
}: {
  orderId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function save() {
    setBusy(true);
    setMessage(null);
    const failure = await call(`/api/bff/orders/${orderId}/invoice`, 'POST', {
      invoiceUrl: value.trim(),
    });
    setBusy(false);
    setMessage(
      failure ? { ok: false, text: failure } : { ok: true, text: 'Saved.' },
    );
    if (!failure) router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Invoice link (https://...)"
          maxLength={500}
          aria-label="Invoice link"
          className="w-52 rounded border border-gray-500 bg-transparent p-1 text-xs"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || value.trim() === (initial ?? '')}
          className="rounded border border-gray-500 px-2 text-xs hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? '...' : 'Save'}
        </button>
      </div>
      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={
            message.ok ? 'text-xs text-green-400' : 'text-xs text-red-400'
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
