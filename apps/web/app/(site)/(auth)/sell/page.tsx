import { redirect } from 'next/navigation';
import { SellerSignUpForm } from '@/components/AuthForms';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Create your store | Orbit' };

export default async function SellPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === 'SELLER' ? '/seller/products' : '/');
  return <SellerSignUpForm />;
}
