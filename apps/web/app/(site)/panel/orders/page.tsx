import { InvoiceField, ShipDeliverButton } from '@/components/PanelControls';
import { formatPrice } from '@/lib/catalog';
import { addressLines, formatWindow, statusLabel } from '@/lib/orders-shared';
import { getStoreOrders } from '@/lib/panel';

export const metadata = { title: 'Orders | Seller panel | Orbit' };

export default async function PanelOrdersPage() {
  const orders = await getStoreOrders();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      {orders === null ? (
        <p role="alert" className="text-red-400">
          The orders could not be loaded. Try again in a moment.
        </p>
      ) : orders.length === 0 ? (
        <p>No orders yet. They show up here when a customer buys.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-gray-400">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Items</th>
                <th className="py-2 pr-4">Deliver to</th>
                <th className="py-2 pr-4 text-right">Total</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Invoice (NF)</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-800 align-top"
                >
                  <td className="py-2 pr-4">
                    {new Date(order.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="py-2 pr-4">
                    {order.customer.name || order.customer.email}
                  </td>
                  <td className="py-2 pr-4">
                    {order.items
                      .map((i) => `${i.quantity} × ${i.name}`)
                      .join(', ')}
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    {order.shippingAddress ? (
                      addressLines(order.shippingAddress).map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">Pickup at the store</span>
                    )}
                    {order.estimatedFrom && order.estimatedTo && (
                      <span className="mt-1 block text-gray-400">
                        {order.status === 'DELIVERED'
                          ? 'Was due'
                          : order.deliveryMethod === 'PICKUP'
                            ? 'Ready by'
                            : 'Due'}{' '}
                        {formatWindow(order.estimatedFrom, order.estimatedTo)}
                      </span>
                    )}
                    {order.trackingCode && (
                      <span className="block text-gray-400">
                        Tracking: {order.trackingCode}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {formatPrice(order.totalCents)}
                  </td>
                  <td className="py-2 pr-4">
                    {statusLabel(order.status)}
                    {order.deliveryMethod === 'PICKUP' && (
                      <span className="block text-xs text-gray-400">
                        Pickup
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {order.status === 'PENDING_PAYMENT' ||
                    order.status === 'CANCELLED' ? (
                      <span className="text-xs text-gray-400">-</span>
                    ) : (
                      <InvoiceField
                        orderId={order.id}
                        initial={order.invoiceUrl}
                      />
                    )}
                  </td>
                  <td className="py-2">
                    <ShipDeliverButton
                      orderId={order.id}
                      status={order.status}
                    />
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
