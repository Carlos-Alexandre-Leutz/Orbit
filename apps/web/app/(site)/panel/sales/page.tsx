import Link from 'next/link';
import { formatPrice } from '@/lib/catalog';
import { getSales } from '@/lib/panel';
import { barPercents, parsePeriod, PERIODS } from '@/lib/sales';

export const metadata = { title: 'Sales | Seller panel | Orbit' };

export default async function PanelSalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const days = parsePeriod((await searchParams).days);
  const sales = await getSales(days);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Sales</h1>
        <nav aria-label="Period" className="flex gap-2 text-sm">
          {PERIODS.map((period) => (
            <Link
              key={period}
              href={`/panel/sales?days=${period}`}
              aria-current={period === days ? 'page' : undefined}
              className={`rounded px-3 py-1 ${
                period === days ? 'bg-blue-700' : 'border border-gray-600 hover:bg-gray-800'
              }`}
            >
              {period} days
            </Link>
          ))}
        </nav>
      </div>
      {sales === null ? (
        <p role="alert" className="text-red-400">
          The sales could not be loaded. Try again in a moment.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Revenue', formatPrice(sales.revenueCents)],
              ['Orders', String(sales.orders)],
              ['Units sold', String(sales.units)],
              ['Average order', formatPrice(sales.averageOrderCents)],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-gray-800 p-3">
                <dt className="text-sm text-gray-400">{label}</dt>
                <dd className="text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <section aria-label="Revenue per day">
            <h2 className="mb-2 text-lg font-semibold">Revenue per day</h2>
            {sales.orders === 0 ? (
              <p className="text-gray-400">
                No paid orders in the last {sales.days} days.
              </p>
            ) : (
              <ol className="flex h-40 items-end gap-px" aria-label="Bars by day">
                {sales.byDay.map((day, i) => (
                  <li
                    key={day.date}
                    className="flex-1 rounded-t bg-blue-600"
                    style={{
                      height: `${barPercents(sales.byDay.map((d) => d.revenueCents))[i]}%`,
                    }}
                    title={`${day.date}: ${formatPrice(day.revenueCents)} in ${day.orders} order(s)`}
                  >
                    <span className="sr-only">
                      {day.date}: {formatPrice(day.revenueCents)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section aria-label="Best sellers">
            <h2 className="mb-2 text-lg font-semibold">Best sellers</h2>
            {sales.topProducts.length === 0 ? (
              <p className="text-gray-400">Nothing sold in this period.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-700 text-gray-400">
                  <tr>
                    <th className="py-2 pr-4">Product</th>
                    <th className="py-2 pr-4 text-right">Units</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.topProducts.map((p) => (
                    <tr key={p.productId} className="border-b border-gray-800">
                      <td className="py-2 pr-4">
                        {p.name} <span className="text-gray-500">{p.sku}</span>
                      </td>
                      <td className="py-2 pr-4 text-right">{p.units}</td>
                      <td className="py-2 text-right">{formatPrice(p.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
