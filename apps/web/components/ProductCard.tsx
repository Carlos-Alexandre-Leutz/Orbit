import Link from 'next/link';
import { formatPrice, type Product } from '@/lib/catalog';
import { imageSrc } from '@/lib/images';

export const LOW_STOCK = 5;

export function StockLabel({ stock }: { stock: number }) {
  if (stock > 0 && stock <= LOW_STOCK) {
    return <span className="text-sm text-amber-400">Only {stock} left</span>;
  }
  return stock > 0 ? (
    <span className="text-sm text-green-400">In stock ({stock})</span>
  ) : (
    <span className="text-sm text-red-400">Out of stock</span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <li className="flex flex-col justify-between overflow-hidden rounded border border-gray-700">
      {product.imageIds?.[0] ? (
        <Link href={`/${product.store.slug}/products/${product.id}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc(product.imageIds[0])}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </Link>
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-square w-full items-center justify-center bg-gray-900 text-4xl text-gray-600"
        >
          {product.name.slice(0, 1)}
        </div>
      )}
      <div className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {product.category.name}
        </p>
        <h2 className="font-semibold">
          <Link
            href={`/${product.store.slug}/products/${product.id}`}
            className="hover:underline"
          >
            {product.name}
          </Link>
        </h2>
        <p className="line-clamp-2 text-sm text-gray-400">
          {product.description}
        </p>
      </div>
      <div className="flex items-center justify-between p-4 pt-0">
        <span className="text-lg font-bold">
          {formatPrice(product.priceCents)}
        </span>
        <StockLabel stock={product.stock} />
      </div>
    </li>
  );
}
