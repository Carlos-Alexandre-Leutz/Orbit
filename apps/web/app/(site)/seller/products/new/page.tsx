import Link from 'next/link';
import { ProductForm } from '@/components/ProductForm';
import { bffRequest } from '@/lib/bff';
import type { Category } from '@/lib/catalog';
import { requireProductManager } from '@/lib/guard';

export const metadata = { title: 'New product | Orbit Supply Co.' };

export default async function NewProductPage() {
  await requireProductManager('/seller/products/new');
  const categories = await bffRequest<Category[]>('/categories');
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <Link
        href="/seller/products"
        className="text-sm text-blue-400 hover:underline"
      >
        Back to the products
      </Link>
      <h1 className="text-2xl font-bold">New product</h1>
      {categories.ok ? (
        <ProductForm categories={categories.data} />
      ) : (
        <p role="alert" className="text-red-400">
          The categories could not be loaded.
        </p>
      )}
    </main>
  );
}
