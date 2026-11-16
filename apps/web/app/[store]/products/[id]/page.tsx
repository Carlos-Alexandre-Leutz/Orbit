import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart';
import { StockLabel } from '@/components/ProductCard';
import { getCurrentUser } from '@/lib/auth';
import { bffRequest } from '@/lib/bff';
import { formatPrice, type Product } from '@/lib/catalog';
import { imageSrc } from '@/lib/images';
import { getStore } from '@/lib/stores';

export const metadata = { title: 'Product | Orbit' };

export default async function ProductPage({
  params,
}: {
  params: Promise<{ store: string; id: string }>;
}) {
  const { store: slug, id } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
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
  // A product of another store is not found under this link.
  if (product.store.slug !== store.slug) notFound();
  const user = await getCurrentUser();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <Link
        href={`/${store.slug}`}
        className="text-sm text-blue-400 hover:underline"
      >
        Back to {store.name}
      </Link>
      <p className="text-xs uppercase tracking-wide text-gray-400">
        {product.category.name}
      </p>
      {product.imageIds?.length > 0 && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc(product.imageIds[0])}
            alt={product.name}
            className="max-h-96 w-full rounded border border-gray-700 object-contain"
          />
          {product.imageIds.length > 1 && (
            <ul className="flex flex-wrap gap-2">
              {product.imageIds.slice(1).map((id, i) => (
                <li key={id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc(id)}
                    alt={`${product.name}, picture ${i + 2}`}
                    className="h-20 w-20 rounded border border-gray-700 object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-gray-300">
        {product.description || 'No description.'}
      </p>
      <p className="text-2xl font-bold">{formatPrice(product.priceCents)}</p>
      <StockLabel stock={product.stock} />
      <AddToCart
        store={store.slug}
        productId={product.id}
        stock={product.stock}
        signedIn={Boolean(user)}
      />
      <p className="text-xs text-gray-500">SKU {product.sku}</p>
    </main>
  );
}
