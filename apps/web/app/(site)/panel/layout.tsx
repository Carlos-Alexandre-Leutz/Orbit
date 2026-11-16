import Link from 'next/link';
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
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:flex-row">
      <aside className="md:w-52 md:shrink-0">
        <p className="mb-3 text-sm text-gray-400">
          {user.store?.name ?? 'Your store'}
        </p>
        <nav aria-label="Panel" className="flex gap-3 md:flex-col md:gap-1">
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
