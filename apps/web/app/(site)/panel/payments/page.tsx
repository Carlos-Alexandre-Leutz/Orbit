import { PaymentProviderForm } from '@/components/PaymentProviderForm';
import { getOwnStore } from '@/lib/panel';

export const metadata = { title: 'Payments | Seller panel | Orbit' };

const METHODS = [
  {
    name: 'Credit and debit card',
    state: 'Active',
    text: 'Customers pay by card through the provider you connect below. The money goes to your account.',
    active: true,
  },
  {
    name: 'Pix',
    state: 'Coming later',
    text: 'Will arrive together with the real payment provider.',
    active: false,
  },
  {
    name: 'Pay on pickup or delivery',
    state: 'Coming later',
    text: 'Not available yet.',
    active: false,
  },
];

export default async function PanelPaymentsPage() {
  const store = await getOwnStore();
  // The address the seller gives to their provider; it must be reachable from the internet.
  const bff = (process.env.BFF_PUBLIC_URL ?? '<your BFF address>').replace(
    /\/$/,
    '',
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payments</h1>
      <p className="rounded bg-amber-900/40 p-3 text-sm text-amber-200">
        Each store receives its own payments: you connect your account at a
        payment provider, your customers pay into it, and the provider&apos;s
        fees are charged to you. Orbit never holds your money. Use the
        provider&apos;s test keys first; no real money moves with them.
      </p>
      <ul className="space-y-3">
        {METHODS.map((method) => (
          <li
            key={method.name}
            className="flex items-start justify-between gap-4 rounded-lg border border-gray-700 p-4"
          >
            <div className="space-y-1">
              <p className="font-medium">{method.name}</p>
              <p className="text-sm text-gray-400">{method.text}</p>
            </div>
            <span
              className={`shrink-0 rounded px-2 py-1 text-xs ${method.active ? 'bg-green-900 text-green-200' : 'bg-gray-800 text-gray-400'}`}
            >
              {method.state}
            </span>
          </li>
        ))}
      </ul>
      {store ? (
        <PaymentProviderForm
          connected={
            store.paymentConnected && store.paymentProvider
              ? {
                  provider: store.paymentProvider,
                  publicKey: store.paymentPublicKey ?? '',
                }
              : null
          }
          webhookBase={`${bff}/payments/webhook/${store.slug}`}
        />
      ) : (
        <p role="alert" className="text-red-400">
          Your store could not be loaded. Try again in a moment.
        </p>
      )}
    </div>
  );
}
