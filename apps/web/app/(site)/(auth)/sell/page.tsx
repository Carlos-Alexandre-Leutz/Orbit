import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SellerSignUpForm } from '@/components/AuthForms';
import { LogoutButton } from '@/components/LogoutButton';
import { StoreSetupForm } from '@/components/StoreSetupForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Create your Orbit account | Orbit' };

export default async function SellPage() {
  const user = await getCurrentUser();
  if (!user) return <SellerSignUpForm />;
  if (user.role === 'SELLER') redirect('/panel');

  const origin = (process.env.APP_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 rounded bg-black p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold">Create your store</h1>
        {user.role === 'ADMIN' ? (
          <p className="text-sm text-gray-300">
            You are signed in as {user.email}, a platform admin account. Sign
            out to create a store.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-300">
              You are signed in as {user.email}. Your Orbit account can have a
              store too: name it and it gets a link right away.
            </p>
            <StoreSetupForm origin={origin} />
          </>
        )}
        <div className="flex items-center justify-between">
          <LogoutButton to="/sell" />
          <Link href="/" className="text-sm text-blue-400 hover:underline">
            Back to the stores
          </Link>
        </div>
      </div>
    </main>
  );
}
