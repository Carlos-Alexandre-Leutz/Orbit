import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart';
import { StockLabel } from '@/components/ProductCard';
import { getCurrentUser } from '@/lib/auth';
import { bffRequest } from '@/lib/bff';
import { formatPrice, type Product } from '@/lib/catalog';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await bffRequest<Product>(
    `/products/${encodeURIComponent(id)}`,
  );
  // A removed or malformed id is "not found" to the visitor, not an error.
  if (result.status === 404 || result.status === 400) notFound();
  if (!result.ok) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <p role="alert" className="text-red-400">
          The product could not be loaded. Try again in a moment.
        </p>
      </main>
    );
  }
  const product = result.data;
  const user = await getCurrentUser();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <Link href="/catalog" className="text-sm text-blue-400 hover:underline">
        Back to the catalog
      </Link>
      <p className="text-xs uppercase tracking-wide text-gray-400">
        {product.category.name}
      </p>
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-gray-300">
        {product.description || 'No description.'}
      </p>
      <p className="text-2xl font-bold">{formatPrice(product.priceCents)}</p>
      <StockLabel stock={product.stock} />
      <AddToCart
        productId={product.id}
        stock={product.stock}
        signedIn={Boolean(user)}
      />
      <p className="text-xs text-gray-500">SKU {product.sku}</p>
    </main>
  );
}
