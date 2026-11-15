import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/AuthForms';
import { getCurrentUser } from '@/lib/auth';
import { safeNext } from '@/lib/session';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return <LoginForm next={next} />;
}
