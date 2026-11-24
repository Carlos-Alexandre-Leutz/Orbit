import { redirect } from 'next/navigation';

export default function OldNewProductPage() {
  redirect('/panel/products/new');
}
