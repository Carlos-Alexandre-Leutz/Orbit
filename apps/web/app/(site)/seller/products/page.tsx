import { redirect } from 'next/navigation';

/** The product pages moved into the seller panel; old links and bookmarks keep working. */
export default function OldProductsPage() {
  redirect('/panel/products');
}
