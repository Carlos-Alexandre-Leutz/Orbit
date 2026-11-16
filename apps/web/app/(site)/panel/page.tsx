import Link from 'next/link';
import { formatPrice } from '@/lib/catalog';
import { getOwnStore, getSummary } from '@/lib/panel';

export const metadata = { title: 'Seller panel | Orbit' };

function Card({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const body = (
    <div className="rounded border border-gray-700 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function PanelPage() {
  const [store, summary] = await Promise.all([getOwnStore(), getSummary()]);
  if (!store || !summary) {
    return (
      <p role="alert" className="text-red-400">
        The panel could not be loaded. Try again in a moment.
      </p>
    );
  }
  const base = process.env.APP_URL?.replace(/\/$/, '') ?? '';
  const link = `${base}/${store.slug}`;
  const open = summary.orders.PAID ?? 0;
  const steps = [
    {
      done: store.description.trim().length > 0,
      text: 'Describe your store',
      href: '/panel/settings',
    },
    {
      done: summary.products > 0,
      text: 'Add your first product',
      href: '/panel/products/new',
    },
    {
      done: true,
      text: `Share your store link: ${link}`,
      href: `/${store.slug}`,
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{store.name}</h1>

      <p className="rounded bg-amber-900/40 p-3 text-sm text-amber-200">
        Payments are in test mode: customers pay with simulated test cards and
        no real money moves. A real payment provider will replace this later.
      </p>

      <section aria-label="Publish your store" className="space-y-2">
        <h2 className="text-lg font-semibold">Publish your store</h2>
        <p className="text-sm text-gray-400">
          Your store is live at its link as soon as it has products. A few steps
          make it ready for customers.
        </p>
        <ul className="space-y-1 text-sm">
          {steps.map((step) => (
            <li key={step.text}>
              <span aria-hidden="true">{step.done ? '✓' : '○'}</span>{' '}
              <Link href={step.href} className="text-blue-400 hover:underline">
                {step.text}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Paid, waiting to ship" value={open} href="/panel/orders" />
        <Card label="Sales" value={formatPrice(summary.revenueCents)} />
        <Card
          label="Active products"
          value={summary.products}
          href="/panel/products"
        />
        <Card
          label={`Low stock (${summary.lowStockLimit} or fewer)`}
          value={summary.lowStock}
          href="/panel/products"
        />
        <Card
          label="Customers"
          value={summary.customers}
          href="/panel/customers"
        />
      </section>
    </div>
  );
}
