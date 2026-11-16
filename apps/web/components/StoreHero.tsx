import { imageSrc, safeColor } from '@/lib/images';
import type { Store } from '@/lib/stores';

/** The top of a store's page: its cover (or its color), logo, name and what it says about itself. */
export function StoreHero({ store }: { store: Store }) {
  const color = safeColor(store.primaryColor);
  return (
    <section
      aria-label={store.name}
      className="relative overflow-hidden rounded-lg"
      style={{ backgroundColor: color }}
    >
      {store.coverImageId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc(store.coverImageId)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="relative flex min-h-40 flex-col justify-end gap-2 bg-gradient-to-t from-black/70 to-black/10 p-6 md:min-h-56">
        <div className="flex items-center gap-4">
          {store.logoImageId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc(store.logoImageId)}
              alt=""
              className="h-14 w-14 rounded-lg border-2 border-white/80 bg-white object-cover"
            />
          )}
          <h1 className="text-3xl font-bold text-white">{store.name}</h1>
        </div>
        {store.tagline && (
          <p className="text-lg text-white/90">{store.tagline}</p>
        )}
        {store.description && (
          <p className="max-w-2xl text-sm text-white/80">{store.description}</p>
        )}
      </div>
    </section>
  );
}
