import { redirect } from 'next/navigation';

/** Customers sign up inside a store; the platform sign-up is for sellers and lives at /sell. */
export default function RegisterPage() {
  redirect('/sell');
}
