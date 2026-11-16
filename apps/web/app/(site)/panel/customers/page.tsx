import { formatPrice } from '@/lib/catalog';
import { getStoreCustomers } from '@/lib/panel';

export const metadata = { title: 'Customers | Seller panel | Orbit' };

export default async function PanelCustomersPage() {
  const customers = await getStoreCustomers();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <p className="text-sm text-gray-400">
        Only people who joined or bought from your store appear here, with what
        your own orders show about them.
      </p>
      {customers === null ? (
        <p role="alert" className="text-red-400">
          The customers could not be loaded. Try again in a moment.
        </p>
      ) : customers.length === 0 ? (
        <p>No customers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-gray-400">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">E-mail</th>
                <th className="py-2 pr-4">Joined</th>
                <th className="py-2 pr-4 text-right">Orders</th>
                <th className="py-2 pr-4 text-right">Spent</th>
                <th className="py-2">Marketing</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email} className="border-b border-gray-800">
                  <td className="py-2 pr-4">{c.name ?? '-'}</td>
                  <td className="py-2 pr-4">{c.email}</td>
                  <td className="py-2 pr-4">
                    {new Date(c.joinedAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="py-2 pr-4 text-right">{c.orders}</td>
                  <td className="py-2 pr-4 text-right">
                    {formatPrice(c.spentCents)}
                  </td>
                  <td className="py-2">
                    {c.marketingConsent ? 'Allowed' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
