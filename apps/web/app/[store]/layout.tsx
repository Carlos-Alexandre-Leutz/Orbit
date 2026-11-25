import Link from 'next/link';
import type { CSSProperties } from 'react';
import { BackToTop } from '@/components/BackToTop';
import { SiteHeader } from '@/components/SiteHeader';
import { StoreChat } from '@/components/StoreChat';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { getCurrentUser } from '@/lib/auth';
import { onColor, safeColor } from '@/lib/images';
import { getStore } from '@/lib/stores';
import { templateOf } from '@/lib/templates';

/**
 * The header of a store's pages. It lives in this layout, not in the root one, because a layout is kept
 * between page changes: here it is made again when the store in the address changes, so the menu never
 * shows the previous store. The store's main color is set here as a CSS variable for everything under it.
 */
export default async function StoreLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ store: string }>;
}>) {
  const { store: slug } = await params;
  const store = await getStore(slug);
  const color = safeColor(store?.primaryColor);
  const style = {
    '--store-color': color,
    '--store-on-color': onColor(color),
  } as CSSProperties;
  const user = await getCurrentUser();
  const isOwner = user?.role === 'SELLER' && user.store?.slug === slug;
  const draft = store?.published === false;
  const suspended = store?.suspended === true && user?.role !== 'ADMIN';
  return (
    <div
      className="store-theme flex flex-1 flex-col bg-white text-neutral-900"
      data-template={templateOf(store?.template)}
      style={style}
    >
      {store ? <StoreHeader store={store} /> : <SiteHeader storeSlug={slug} />}
      {store && draft && isOwner && (
        <p className="bg-amber-900/40 px-4 py-2 text-center text-sm text-amber-200">
          This store is a draft: only you can see it.{' '}
          <Link href="/panel" className="underline">
            Publish it in your panel
          </Link>
        </p>
      )}
      {store && suspended ? (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">{store.name} is unavailable</h1>
          <p className="text-gray-400">
            {isOwner
              ? 'Orbit suspended this store. Contact Orbit to open it again.'
              : 'This store is closed for now. Come back later.'}
          </p>
        </main>
      ) : store && draft && !isOwner ? (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">{store.name} is not open yet</h1>
          <p className="text-gray-400">
            This store is being set up. Come back soon.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/${slug}`)}`}
            className="text-sm text-blue-400 hover:underline"
          >
            Store owner? Sign in
          </Link>
        </main>
      ) : (
        <>
          {children}
          {store && <StoreFooter store={store} />}
          {store && !draft && <StoreChat slug={slug} name={store.name} />}
          <BackToTop />
        </>
      )}
    </div>
  );
}
