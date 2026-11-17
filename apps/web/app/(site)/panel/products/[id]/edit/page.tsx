import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/ProductForm';
import { bffRequest } from '@/lib/bff';
import type { Product } from '@/lib/catalog';
import { getOwnCategories } from '@/lib/panel';
import { requireSeller } from '@/lib/guard';

export const metadata = { title: 'Edit product | Orbit Supply Co.' };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSeller(`/panel/products/${id}/edit`);
  const [product, categories] = await Promise.all([
    bffRequest<Product>(`/products/${encodeURIComponent(id)}`),
    getOwnCategories(),
  ]);
  if (product.status === 404 || product.status === 400) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <Link
        href="/panel/products"
        className="text-sm text-blue-400 hover:underline"
      >
        Back to the products
      </Link>
      <h1 className="text-2xl font-bold">Edit product</h1>
      {product.ok && categories ? (
        <ProductForm
          // A product that still uses an old shared category keeps it in the list.
          categories={
            categories.some((c) => c.slug === product.data.category.slug)
              ? categories
              : [...categories, product.data.category]
          }
          product={product.data}
        />
      ) : (
        <p role="alert" className="text-red-400">
          The product could not be loaded.
        </p>
      )}
    </main>
  );
}
