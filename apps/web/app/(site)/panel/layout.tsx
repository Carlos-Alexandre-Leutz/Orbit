import Link from 'next/link';
import { StoreSetupForm } from '@/components/StoreSetupForm';
import { requireSeller } from '@/lib/guard';

const LINKS = [
  { href: '/panel', label: 'Overview' },
  { href: '/panel/products', label: 'Products' },
  { href: '/panel/orders', label: 'Orders' },
  { href: '/panel/customers', label: 'Customers' },
  { href: '/panel/settings', label: 'Store settings' },
];

/** The seller panel: everything behind it is about the store of the logged-in seller. */
export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireSeller('/panel');
  // A new account has no store yet: the first step is to name it, which gives it its link.
  if (!user.store) {
    const origin = (process.env.APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    return (
      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            Welcome{user.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-gray-400">
            Let&apos;s set up your store. Give it a name and it gets a link you
            can open and share right away.
          </p>
        </div>
        <StoreSetupForm origin={origin} />
      </main>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:flex-row">
      <aside className="md:w-52 md:shrink-0">
        <p className="mb-3 text-sm text-gray-400">
          {user.store?.name ?? 'Your store'}
        </p>
        <nav
          aria-label="Panel"
          className="flex flex-wrap gap-3 md:flex-col md:gap-1"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-2 py-1 text-sm hover:bg-gray-800"
            >
              {link.label}
            </Link>
          ))}
          {user.store && (
            <Link
              href={`/${user.store.slug}`}
              className="rounded px-2 py-1 text-sm text-blue-400 hover:bg-gray-800"
            >
              View my store
            </Link>
          )}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
