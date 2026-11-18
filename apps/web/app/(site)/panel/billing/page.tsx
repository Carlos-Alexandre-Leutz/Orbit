import { MercadoPagoPaymentForm } from '@/components/MercadoPagoPaymentForm';
import { getBillingStatus } from '@/lib/billing';

export const metadata = { title: 'Billing | Seller panel | Orbit' };

function price(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(
    cents / 100,
  );
}

export default async function PanelBillingPage() {
  const billing = await getBillingStatus();
  if (!billing) {
    return (
      <p role="alert" className="text-red-400">
        The billing data could not be loaded. Try again in a moment.
      </p>
    );
  }
  const cost = price(billing.plan.priceCents, billing.plan.currency);
  const active = billing.status === 'authorized';
  const ended = billing.status === 'cancelled' || billing.status === 'paused';
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-gray-400">
        {billing.plan.name}: {cost} per month, with {billing.trialDays} days
        free. Pay with any credit card; no Mercado Pago account is needed. The
        card is typed into fields drawn by Mercado Pago, so Orbit never sees
        it. Nothing is charged during the free days, and you can cancel before
        they end.
      </p>
      {active ? (
        <div className="space-y-1 rounded-lg border border-green-800 p-4">
          <p className="font-medium text-green-300">Your plan is active.</p>
          {billing.trialEndsAt && (
            <p className="text-sm text-gray-400">
              Free days until{' '}
              {new Date(billing.trialEndsAt).toLocaleDateString('pt-BR')}.
              After that, {cost} is charged every month.
            </p>
          )}
        </div>
      ) : !billing.configured ? (
        <p className="rounded bg-amber-900/40 p-3 text-sm text-amber-200">
          Billing is not set up on this server yet, so the free trial cannot
          start. Ask the Orbit team.
        </p>
      ) : (
        <div className="space-y-3 rounded-lg border border-gray-700 p-4">
          {ended && (
            <p role="alert" className="text-sm text-red-400">
              Your subscription was {billing.status}, so your store is
              suspended. Register a card again to open it.
            </p>
          )}
          {billing.status === 'pending' && (
            <p className="text-sm text-amber-200">
              You started the trial but did not finish registering the card.
              You can try again.
            </p>
          )}
          {billing.publicKey ? (
            <MercadoPagoPaymentForm
              subscription
              publicKey={billing.publicKey}
              totalLabel={`Start ${billing.trialDays} free days`}
              defaultEmail={billing.ownerEmail}
            />
          ) : (
            <p className="rounded bg-amber-900/40 p-3 text-sm text-amber-200">
              The card form is not set up on this server yet. Ask the Orbit
              team.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
