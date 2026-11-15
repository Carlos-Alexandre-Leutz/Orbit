import Link from 'next/link';
import { formatPrice, type Product } from '@/lib/catalog';

export function StockLabel({ stock }: { stock: number }) {
  return stock > 0 ? (
    <span className="text-sm text-green-400">In stock ({stock})</span>
  ) : (
    <span className="text-sm text-red-400">Out of stock</span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <li className="flex flex-col justify-between rounded border border-gray-700 p-4">
      <div className="space-y-1">
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
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold">
          {formatPrice(product.priceCents)}
        </span>
        <StockLabel stock={product.stock} />
      </div>
    </li>
  );
}
