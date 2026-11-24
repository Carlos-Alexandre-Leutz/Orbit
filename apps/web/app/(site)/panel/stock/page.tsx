import Link from 'next/link';
import { getStock } from '@/lib/panel';
import { lastsLabel } from '@/lib/sales';

export const metadata = { title: 'Stock | Seller panel | Orbit' };

const BADGE = {
  OUT: ['Out of stock', 'bg-red-900 text-red-200'],
  LOW: ['Low', 'bg-yellow-900 text-yellow-200'],
  OK: ['OK', 'bg-green-900 text-green-200'],
} as const;

export default async function PanelStockPage() {
  const stock = await getStock();
  const attention = stock?.items.filter((i) => i.status !== 'OK').length ?? 0;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Stock</h1>
      {stock === null ? (
        <p role="alert" className="text-red-400">
          The stock could not be loaded. Try again in a moment.
        </p>
      ) : stock.items.length === 0 ? (
        <p>
          No products yet.{' '}
          <Link href="/panel/products/new" className="underline">
            Add the first one
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="text-gray-400">
            {attention === 0
              ? 'Every product has enough stock.'
              : `${attention} product(s) need attention: ${stock.lowStockLimit} units or fewer.`}{' '}
            The estimate uses the sales of the last 30 days.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700 text-gray-400">
                <tr>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4 text-right">In stock</th>
                  <th className="py-2 pr-4 text-right">Sold (30 days)</th>
                  <th className="py-2 pr-4">Lasts</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {stock.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800">
                    <td className="py-2 pr-4">
                      {item.name} <span className="text-gray-500">{item.sku}</span>
                    </td>
                    <td className="py-2 pr-4 text-right">{item.stock}</td>
                    <td className="py-2 pr-4 text-right">{item.sold30}</td>
                    <td className="py-2 pr-4">{lastsLabel(item.daysLeft)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs ${BADGE[item.status][1]}`}>
                        {BADGE[item.status][0]}
                      </span>
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/panel/products/${item.id}/edit`}
                        className="underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
