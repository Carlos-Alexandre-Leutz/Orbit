import { notFound, redirect } from 'next/navigation';
import { CustomerSignUpForm } from '@/components/AuthForms';
import { getCurrentUser } from '@/lib/auth';
import { safeNext } from '@/lib/session';
import { getStore } from '@/lib/stores';

export const metadata = { title: 'Create your account | Orbit' };

export default async function StoreRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const store = await getStore((await params).store);
  if (!store) notFound();
  const next = safeNext((await searchParams).next, `/${store.slug}`);
  if (await getCurrentUser()) redirect(next);
  return <CustomerSignUpForm store={store} next={next} />;
}
