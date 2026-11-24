import Link from 'next/link';
import { ProductForm } from '@/components/ProductForm';
import { getOwnCategories } from '@/lib/panel';
import { requireSeller } from '@/lib/guard';

export const metadata = { title: 'New product | Orbit Supply Co.' };

export default async function NewProductPage() {
  await requireSeller('/panel/products/new');
  const categories = await getOwnCategories();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <Link
        href="/panel/products"
        className="text-sm text-blue-400 hover:underline"
      >
        Back to the products
      </Link>
      <h1 className="text-2xl font-bold">New product</h1>
      {categories === null ? (
        <p role="alert" className="text-red-400">
          The categories could not be loaded.
        </p>
      ) : categories.length === 0 ? (
        <p>
          Create a category first, such as Blouses or Shoes, to choose it for
          this product.{' '}
          <Link
            href="/panel/categories"
            className="text-blue-400 hover:underline"
          >
            Go to categories
          </Link>
        </p>
      ) : (
        <ProductForm categories={categories} />
      )}
    </main>
  );
}
