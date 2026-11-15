import { redirect } from 'next/navigation';

/** The cart, checkout and orders belong to a store now (`/<link>/...`); the stores list is where to pick one. */
export default function OldOrdersPage() {
  redirect('/');
}
