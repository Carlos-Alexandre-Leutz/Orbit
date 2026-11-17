import Link from 'next/link';
import { PlanPriceForm } from '@/components/PlanPriceForm';
import {
  adminPath,
  getAdminOverview,
  getAdminPlans,
  getAdminStores,
  money,
  type AdminStore,
} from '@/lib/admin';

export const metadata = { title: 'Clients | Orbit admin' };

function state(store: AdminStore): { text: string; style: string } {
  if (store.suspended) return { text: 'Suspended', style: 'bg-red-900 text-red-200' };
  if (store.paid) return { text: 'Paid', style: 'bg-green-900 text-green-200' };
  return { text: 'Not paid', style: 'bg-amber-900 text-amber-200' };
}

export default async function AdminHomePage() {
  const base = adminPath();
  const [overview, stores, plans] = await Promise.all([
    getAdminOverview(),
    getAdminStores(),
    getAdminPlans(),
  ]);
  if (!overview || !stores || !plans || !base) {
    return (
      <p role="alert" className="text-red-400">
        The admin data could not be loaded. Try again in a moment.
      </p>
    );
  }
  const numbers = [
    { label: 'Stores', value: String(overview.stores) },
    { label: 'Paying', value: String(overview.paying) },
    { label: 'Suspended', value: String(overview.suspended) },
    {
      label: 'Per month, from paying stores',
      value: money(overview.monthlyCents, overview.currency),
    },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients</h1>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {numbers.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-700 p-4">
            <dt className="text-sm text-gray-400">{item.label}</dt>
            <dd className="text-xl font-bold">{item.value}</dd>
          </div>
        ))}
      </dl>
      {plans.map((plan) => (
        <PlanPriceForm
          key={plan.id}
          base={base}
          planId={plan.id}
          name={plan.name}
          priceCents={plan.priceCents}
          currency={plan.currency}
        />
      ))}
      {stores.length === 0 ? (
        <p>No stores yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-gray-400">
              <tr>
                <th className="py-2 pr-4">Store</th>
                <th className="py-2 pr-4">Owner</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Paid until</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Payments</th>
                <th className="py-2 pr-4 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => {
                const s = state(store);
                return (
                  <tr key={store.slug} className="border-b border-gray-800">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/${base}/stores/${store.slug}`}
                        className="font-medium text-blue-400 hover:underline"
                      >
                        {store.name}
                      </Link>
                      <p className="text-xs text-gray-500">/{store.slug}</p>
                    </td>
                    <td className="py-2 pr-4">{store.owner.email}</td>
                    <td className="py-2 pr-4">{store.plan.name}</td>
                    <td className="py-2 pr-4">
                      {store.paidUntil
                        ? new Date(store.paidUntil).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded px-2 py-1 text-xs ${s.style}`}>
                        {s.text}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {store.paymentConnected ? 'Connected' : 'Not connected'}
                    </td>
                    <td className="py-2 pr-4 text-right">{store.orders}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
