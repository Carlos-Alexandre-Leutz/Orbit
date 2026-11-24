import { StoreSettingsForm } from '@/components/PanelControls';
import { getOwnStore } from '@/lib/panel';

export const metadata = { title: 'Store settings | Seller panel | Orbit' };

export default async function PanelSettingsPage() {
  const store = await getOwnStore();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Store settings</h1>
      {store ? (
        <>
          <p className="text-sm text-gray-400">
            Your link, /{store.slug}, never changes.
          </p>
          <StoreSettingsForm initial={store} />
        </>
      ) : (
        <p role="alert" className="text-red-400">
          Your store could not be loaded. Try again in a moment.
        </p>
      )}
    </div>
  );
}
