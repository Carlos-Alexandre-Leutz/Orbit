import { SiteHeader } from '@/components/SiteHeader';

/**
 * The header of a store's pages. It lives in this layout, not in the root one, because a layout is kept
 * between page changes: here it is made again when the store in the address changes, so the menu never
 * shows the previous store.
 */
export default async function StoreLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ store: string }>;
}>) {
  const { store } = await params;
  return (
    <>
      <SiteHeader storeSlug={store} />
      {children}
    </>
  );
}
