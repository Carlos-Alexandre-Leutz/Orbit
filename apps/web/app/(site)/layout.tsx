import { SiteHeader } from '@/components/SiteHeader';

/** The pages that belong to no store: the stores list, sign in and out, the seller pages. */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
