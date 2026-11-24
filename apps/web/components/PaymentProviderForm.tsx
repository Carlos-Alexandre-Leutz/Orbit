'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PROVIDERS = {
  stripe: {
    label: 'Stripe',
    secret: 'Secret key (sk_...)',
    publicKey: 'Publishable key (pk_...)',
    steps: [
      'In the Stripe dashboard, open Developers, then API keys, and copy the publishable key and the secret key.',
      'Open Developers, then Webhooks, and add an endpoint with the address below. Listen to payment_intent.succeeded and payment_intent.payment_failed.',
      'Copy the endpoint’s signing secret (whsec_...).',
    ],
  },
  mercadopago: {
    label: 'Mercado Pago',
    secret: 'Access token',
    publicKey: 'Public key',
    steps: [
      'In Mercado Pago, open Your integrations, create an application and copy its public key and access token.',
      'In the application’s Webhooks, add the address below and select the Payments event.',
      'Copy the secret signature that Mercado Pago shows for it.',
    ],
  },
} as const;

type ProviderId = keyof typeof PROVIDERS;

/**
 * Where a seller connects their own payment provider (ADR-008): the money of their sales goes to their
 * account and the provider's fees are theirs. The secrets are sent once and never shown again.
 */
export function PaymentProviderForm({
  connected,
  webhookBase,
}: {
  connected: { provider: string; publicKey: string } | null;
  webhookBase: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderId>('stripe');
  const [values, setValues] = useState({
    secretKey: '',
    publicKey: '',
    webhookSecret: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const info = PROVIDERS[provider];
  const set = (key: keyof typeof values) => (value: string) =>
    setValues((old) => ({ ...old, [key]: value }));

  async function send(method: 'PUT' | 'DELETE') {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/bff/stores/mine/payments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'PUT' ? JSON.stringify({ provider, ...values }) : null,
      });
      if (response.ok) {
        setValues({ secretKey: '', publicKey: '', webhookSecret: '' });
        setMessage({
          ok: true,
          text: method === 'PUT' ? 'Connected.' : 'Disconnected.',
        });
        router.refresh();
      } else {
        const data = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const text = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message;
        setMessage({
          ok: false,
          text: text ?? 'Something went wrong. Try again.',
        });
      }
    } catch {
      setMessage({ ok: false, text: 'The server is not reachable. Try again.' });
    }
    setBusy(false);
  }

  const field = 'w-full rounded border border-gray-500 bg-transparent p-2';
  const name =
    connected && connected.provider in PROVIDERS
      ? PROVIDERS[connected.provider as ProviderId].label
      : connected?.provider;
  return (
    <div className="space-y-4">
      {connected && (
        <div className="space-y-2 rounded-lg border border-green-800 p-4">
          <p className="font-medium text-green-300">Connected: {name}</p>
          <p className="break-all text-sm text-gray-400">
            Public key: {connected.publicKey}
          </p>
          <p className="text-sm text-gray-400">
            Your customers pay into your {name} account, and {name}&apos;s fees
            are charged to it. To change the keys, connect again below.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send('DELETE')}
            className="text-sm text-red-400 hover:underline disabled:opacity-60"
          >
            Disconnect
          </button>
        </div>
      )}
      <form
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          void send('PUT');
        }}
        className="max-w-2xl space-y-4"
      >
        <h2 className="text-lg font-semibold">
          {connected ? 'Replace the connection' : 'Connect your provider'}
        </h2>
        <label className="block space-y-1 text-sm">
          Payment provider
          <select
            className={field}
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderId)}
          >
            {Object.entries(PROVIDERS).map(([id, item]) => (
              <option key={id} value={id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-400">
          {info.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="break-all rounded bg-gray-900 p-2 text-sm">
          Webhook address: <code>{webhookBase}</code>
        </p>
        <label className="block space-y-1 text-sm">
          {info.publicKey}
          <input
            className={field}
            name="payment-public-key"
            value={values.publicKey}
            onChange={(e) => set('publicKey')(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          {info.secret}
          <input
            type="password"
            className={field}
            name="payment-secret-key"
            value={values.secretKey}
            onChange={(e) => set('secretKey')(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          Webhook secret
          <input
            type="password"
            className={field}
            name="payment-webhook-secret"
            value={values.webhookSecret}
            onChange={(e) => set('webhookSecret')(e.target.value)}
            autoComplete="new-password"
            required
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
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? 'Saving...' : 'Connect'}
        </button>
      </form>
    </div>
  );
}
