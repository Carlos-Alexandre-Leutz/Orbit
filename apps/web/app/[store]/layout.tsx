import type { CSSProperties } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { StoreFooter } from '@/components/StoreFooter';
import { onColor, safeColor } from '@/lib/images';
import { getStore } from '@/lib/stores';

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
  return (
    <div className="store-theme contents" style={style}>
      <SiteHeader storeSlug={slug} />
      {children}
      {store && <StoreFooter store={store} />}
    </div>
  );
}
