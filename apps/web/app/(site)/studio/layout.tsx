import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminPath } from '@/lib/admin';
import { requireAdmin } from '@/lib/guard';

export const metadata = { title: 'Orbit admin' };

/** The Orbit owner's area. Anyone who is not an admin gets "not found", as if it did not exist. */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const base = adminPath();
  if (!base) notFound();
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <nav className="flex gap-4 border-b border-gray-700 pb-3 text-sm">
        <Link href={`/${base}`} className="font-semibold hover:underline">
          Orbit admin
        </Link>
        <Link href={`/${base}`} className="hover:underline">
          Clients
        </Link>
      </nav>
      {children}
    </div>
  );
}
