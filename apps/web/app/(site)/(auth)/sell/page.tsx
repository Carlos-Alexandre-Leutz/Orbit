import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SellerSignUpForm } from '@/components/AuthForms';
import { LogoutButton } from '@/components/LogoutButton';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Create your store | Orbit' };

export default async function SellPage() {
  const user = await getCurrentUser();
  if (user?.role === 'SELLER') redirect('/panel');
  if (!user) return <SellerSignUpForm />;

  // A customer or an admin is signed in: an e-mail has one role, so say why the form is not shown.
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4 rounded bg-black p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold">Create your store</h1>
        <p className="text-sm text-gray-300">
          You are signed in as {user.email}, a{' '}
          {user.role === 'ADMIN' ? 'platform admin' : 'customer'} account. An
          e-mail is either a customer or a seller, so to open a store sign out
          and sign up with another e-mail.
        </p>
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
