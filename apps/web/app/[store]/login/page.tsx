import { notFound, redirect } from 'next/navigation';
import { LoginForm } from '@/components/AuthForms';
import { getCurrentUser } from '@/lib/auth';
import { safeNext } from '@/lib/session';
import { getStore } from '@/lib/stores';

export const metadata = { title: 'Sign in | Orbit' };

export default async function StoreLoginPage({
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
  return <LoginForm next={next} store={store} />;
}
