import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { menuFor } from '@/lib/menu';
import { LogoutButton } from './LogoutButton';

const ROLE_LABEL = {
  CUSTOMER: 'Customer',
  SELLER: 'Seller',
  ADMIN: 'Admin',
} as const;

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-gray-700">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/catalog" className="text-lg font-bold">
            Orbit Supply Co.
          </Link>
          <nav aria-label="Main" className="flex gap-4 text-sm">
            {menuFor(user?.role).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span>
                {user.name || user.email}{' '}
                <span className="rounded bg-gray-700 px-2 py-0.5 text-xs">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
