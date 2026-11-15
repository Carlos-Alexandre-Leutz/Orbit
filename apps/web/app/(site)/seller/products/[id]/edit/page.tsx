import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/ProductForm';
import { bffRequest } from '@/lib/bff';
import type { Category, Product } from '@/lib/catalog';
import { requireProductManager } from '@/lib/guard';

export const metadata = { title: 'Edit product | Orbit Supply Co.' };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProductManager(`/seller/products/${id}/edit`);
  const [product, categories] = await Promise.all([
    bffRequest<Product>(`/products/${encodeURIComponent(id)}`),
    bffRequest<Category[]>('/categories'),
  ]);
  if (product.status === 404 || product.status === 400) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <Link
        href="/seller/products"
        className="text-sm text-blue-400 hover:underline"
      >
        Back to the products
      </Link>
      <h1 className="text-2xl font-bold">Edit product</h1>
      {product.ok && categories.ok ? (
        <ProductForm categories={categories.data} product={product.data} />
      ) : (
        <p role="alert" className="text-red-400">
          The product could not be loaded.
        </p>
      )}
    </main>
  );
}
