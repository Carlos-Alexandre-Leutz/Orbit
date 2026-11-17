import { imageSrc } from '@/lib/images';
import { BannerCarousel } from './BannerCarousel';
import type { Store } from '@/lib/stores';
import { templateOf } from '@/lib/templates';

/** The top of a store's page: its cover (or its color), logo, name and what it says about itself. */
export function StoreHero({ store }: { store: Store }) {
  const template = templateOf(store.template);

  // Minimal: no banner, a quiet title row.
  if (template === 'minimal') {
    return (
      <section
        aria-label={store.name}
        className="space-y-1 border-b border-gray-800 pb-4"
      >
        <div className="flex items-center gap-3">
          {store.logoImageId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc(store.logoImageId)}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          )}
          <h1 className="text-2xl font-semibold">{store.name}</h1>
        </div>
        {store.tagline && <p className="text-gray-400">{store.tagline}</p>}
        {store.description && (
          <p className="max-w-2xl text-sm text-gray-500">{store.description}</p>
        )}
      </section>
    );
  }

  // What the store says about itself, under the banner (or alone when there is no banner).
  const intro =
    store.tagline || store.description ? (
      <div className="mx-auto max-w-2xl space-y-1 py-4 text-center">
        {store.tagline && (
          <p className="text-xl font-semibold">{store.tagline}</p>
        )}
        {store.description && (
          <p className="text-sm text-gray-400">{store.description}</p>
        )}
      </div>
    ) : null;

  // No banner image: no big empty block, only the intro when there is one.
  const banners = store.bannerImageIds ?? [];
  if (banners.length === 0) {
    return (
      <section aria-label={store.name}>
        <h1 className="sr-only">{store.name}</h1>
        {intro}
      </section>
    );
  }

  return (
    <section aria-label={store.name}>
      <h1 className="sr-only">{store.name}</h1>
      <BannerCarousel
        ids={banners}
        alt={store.name}
        aspect={template === 'bold' ? 'aspect-[2/1]' : 'aspect-[16/5]'}
      />
      {intro}
    </section>
  );
}
