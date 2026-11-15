import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/AuthForms';
import { getCurrentUser } from '@/lib/auth';
import { safeNext } from '@/lib/session';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return <RegisterForm next={next} />;
}
