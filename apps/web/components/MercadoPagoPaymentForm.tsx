'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/** The little of Mercado Pago's script (MercadoPago.js v2) that this form uses. */
interface MpField {
  mount(id: string): MpField;
  unmount(): void;
  on(event: 'binChange', handler: (e: { bin?: string }) => void): void;
}
interface MpInstance {
  fields: {
    create(type: string, options: object): MpField;
    createCardToken(input: object): Promise<{ id: string }>;
  };
  getPaymentMethods(input: {
    bin: string;
  }): Promise<{ results: { id: string }[] }>;
}
declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: object) => MpInstance;
  }
}

const MP_JS = 'https://sdk.mercadopago.com/js/v2';

function loadMercadoPagoJs(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${MP_JS}"]`,
    );
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () =>
      reject(new Error('Mercado Pago could not be loaded.')),
    );
    if (!existing) {
      script.src = MP_JS;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

const FIELD_BOX =
  'h-11 rounded border border-gray-500 bg-white px-3 py-2 text-sm';

/**
 * The card payment screen for stores that use Mercado Pago. The card number, date and code are typed into
 * fields that Mercado Pago itself draws, so they never touch Orbit; Orbit receives a one-time token and the
 * card brand and sends them to the order's pay endpoint. Written from Mercado Pago's documentation and not
 * yet run against a real account.
 */
export function MercadoPagoPaymentForm({
  publicKey,
  orderId,
  storeSlug,
  totalLabel,
  defaultEmail,
  subscription = false,
}: {
  publicKey: string;
  orderId?: string;
  storeSlug?: string;
  totalLabel?: string;
  defaultEmail: string;
  subscription?: boolean;
}) {
  const router = useRouter();
  const testMode = publicKey.startsWith('TEST-');
  const mp = useRef<MpInstance | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fields: MpField[] = [];
    loadMercadoPagoJs()
      .then(() => {
        if (cancelled || !window.MercadoPago) return;
        const instance = new window.MercadoPago(publicKey, {
          locale: 'en-US',
        });
        mp.current = instance;
        const number = instance.fields
          .create('cardNumber', { placeholder: 'Card number' })
          .mount('mp-card-number');
        fields.push(
          number,
          instance.fields
            .create('expirationDate', { placeholder: 'MM/YY' })
            .mount('mp-expiration'),
          instance.fields
            .create('securityCode', { placeholder: 'CVV' })
            .mount('mp-code'),
        );
        number.on('binChange', ({ bin }) => {
          if (!bin) return setBrand(null);
          instance
            .getPaymentMethods({ bin })
            .then((found) => setBrand(found.results[0]?.id ?? null))
            .catch(() => setBrand(null));
        });
        setReady(true);
      })
      .catch(() => setError('The payment form could not be loaded. Reload.'));
    return () => {
      cancelled = true;
      fields.forEach((field) => field.unmount());
    };
  }, [publicKey]);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (!mp.current) return;
    if (!subscription && !brand) {
      setError('Check the card number.');
      return;
    }
    setBusy(true);
    setError(null);
    let token: string;
    try {
      token = (
        await mp.current.fields.createCardToken({
          cardholderName: name.trim(),
          identificationType: 'CPF',
          identificationNumber: cpf.replace(/\D/g, ''),
        })
      ).id;
    } catch {
      setError('Check the card details.');
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(
        subscription
          ? '/api/bff/billing/start'
          : `/api/bff/orders/${orderId}/pay`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardToken: token,
            ...(subscription ? {} : { cardBrand: brand }),
            payerEmail: email.trim(),
          }),
        },
      );
      if (response.ok) {
        router.replace(
          subscription ? '/panel/billing' : `/${storeSlug}/orders/${orderId}`,
        );
        router.refresh();
        return;
      }
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(
        data?.message ?? 'The payment did not go through. Try another card.',
      );
    } catch {
      setError('The server is not reachable. Try again.');
    }
    setBusy(false);
  }

  const input = 'w-full rounded border border-gray-500 bg-transparent p-2';
  return (
    <form
      onSubmit={pay}
      className="space-y-4 rounded-lg border border-gray-700 p-4"
    >
      {testMode && (
        <p className="rounded bg-amber-900/40 p-3 text-sm text-amber-200">
          Test mode: no real money moves. Use the test cards from Mercado
          Pago&apos;s documentation.
        </p>
      )}
      <label className="block space-y-1 text-sm">
        Name on the card
        <input
          className={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="cc-name"
          maxLength={80}
          required
        />
      </label>
      <div className="space-y-1 text-sm">
        <p>Card number</p>
        <div id="mp-card-number" className={FIELD_BOX} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <p>Expiration</p>
          <div id="mp-expiration" className={FIELD_BOX} />
        </div>
        <div className="space-y-1">
          <p>Security code</p>
          <div id="mp-code" className={FIELD_BOX} />
        </div>
      </div>
      <label className="block space-y-1 text-sm">
        CPF of the card holder
        <input
          className={input}
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          inputMode="numeric"
          maxLength={14}
          required
        />
      </label>
      <label className="block space-y-1 text-sm">
        E-mail
        <input
          type="email"
          className={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={120}
          required
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !ready}
        className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy
          ? subscription
            ? 'Starting...'
            : 'Paying...'
          : subscription
            ? (totalLabel ?? 'Start free trial')
            : `Pay ${totalLabel}${testMode ? ' (test)' : ''}`}
      </button>
    </form>
  );
}
