import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminStoreActions } from '@/components/AdminStoreActions';
import { adminPath, getAdminStore, money } from '@/lib/admin';

export const metadata = { title: 'Client | Orbit admin' };

const ACTIONS = {
  RECORD_PAYMENT: 'Payment recorded',
  SUSPEND: 'Store suspended',
  REACTIVATE: 'Store reactivated',
} as const;

export default async function AdminStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const base = adminPath();
  const store = await getAdminStore(slug);
  if (!base || !store) notFound();
  const rows = [
    ['Owner', `${store.owner.name ?? ''} ${store.owner.email}`.trim()],
    ['Store link', `/${store.slug}`],
    ['Published', store.published ? 'Yes' : 'No (draft)'],
    [
      'Plan',
      `${store.plan.name}, ${money(store.plan.priceCents, store.plan.currency)} per month`,
    ],
    [
      'Subscription',
      store.subscriptionStatus
        ? `${store.subscriptionStatus}${store.trialEndsAt ? `, free days until ${new Date(store.trialEndsAt).toLocaleDateString('pt-BR')}` : ''}`
        : 'Not started',
    ],
    [
      'Paid until',
      store.paidUntil
        ? `${new Date(store.paidUntil).toLocaleDateString('pt-BR')}${store.paid ? '' : ' (overdue)'}`
        : 'Never paid',
    ],
    ['Receives payments', store.paymentConnected ? 'Provider connected' : 'No provider yet'],
    ['Orders', String(store.orders)],
    [
      'Status',
      store.suspended ? `Suspended: ${store.suspendedReason ?? ''}` : 'Active',
    ],
  ];
  return (
    <div className="space-y-6">
      <Link href={`/${base}`} className="text-sm text-blue-400 hover:underline">
        Back to the clients
      </Link>
      <h1 className="text-2xl font-bold">{store.name}</h1>
      <dl className="grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-gray-400">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <AdminStoreActions
        base={base}
        slug={store.slug}
        suspended={store.suspended}
      />
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">History</h2>
        {store.history.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-800 rounded-lg border border-gray-700 text-sm">
            {store.history.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 p-3">
                <span>
                  {ACTIONS[item.action] ?? item.action}
                  {typeof item.detail.reason === 'string' &&
                    `: ${item.detail.reason}`}
                  {typeof item.detail.note === 'string' &&
                    ` (${item.detail.note})`}
                </span>
                <span className="shrink-0 text-gray-400">
                  {new Date(item.createdAt).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
