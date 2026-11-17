import { ShippingForm } from '@/components/PanelControls';
import { getOwnStore } from '@/lib/panel';

export const metadata = { title: 'Shipping | Seller panel | Orbit' };

export default async function PanelShippingPage() {
  const store = await getOwnStore();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Shipping</h1>
      <p className="text-sm text-gray-400">
        Customers see the shipping fee at checkout, and can choose pickup when
        you allow it. The fee is added to the total of the order. The delivery
        days below are the window the customer is promised at checkout.
      </p>
      {store ? (
        <ShippingForm
          initial={{
            shippingFlatCents: store.shippingFlatCents,
            freeShippingOverCents: store.freeShippingOverCents,
            pickupEnabled: store.pickupEnabled,
            handlingDays: store.handlingDays,
            deliveryDaysMin: store.deliveryDaysMin,
            deliveryDaysMax: store.deliveryDaysMax,
            deliveryByState: store.deliveryByState ?? {},
          }}
        />
      ) : (
        <p role="alert" className="text-red-400">
          Your store could not be loaded. Try again in a moment.
        </p>
      )}
    </div>
  );
}
