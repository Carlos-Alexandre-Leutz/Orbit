import { HighlightsForm } from '@/components/PanelControls';
import { getOwnStore } from '@/lib/panel';

export const metadata = { title: 'Highlights | Seller panel | Orbit' };

export default async function PanelHighlightsPage() {
  const store = await getOwnStore();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Store highlights</h1>
      <p className="text-sm text-gray-400">
        Choose up to four things to show in the strip under your banner, such as
        free shipping or secure checkout, and rewrite the text if you like. Only
        promise what your store really offers.
      </p>
      {store ? (
        <HighlightsForm initial={store.highlights} />
      ) : (
        <p role="alert" className="text-red-400">
          Your store could not be loaded. Try again in a moment.
        </p>
      )}
    </div>
  );
}
