import { redirect } from 'next/navigation';

/** The old catalog address: the stores list is the home page now. */
export default function OldCatalogPage() {
  redirect('/');
}
