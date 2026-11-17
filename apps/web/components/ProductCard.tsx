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

/** A product as an online shop shows it: a big picture, the name, the price and a buy button. */
export function ProductCard({ product }: { product: Product }) {
  const href = `/${product.store.slug}/products/${product.id}`;
  const soldOut = product.stock === 0;
  return (
    <li className="group flex flex-col">
      <Link
        href={href}
        className="relative block overflow-hidden rounded bg-gray-800"
      >
        {product.imageIds?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc(product.imageIds[0])}
            alt={product.name}
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-[4/5] w-full items-center justify-center text-5xl text-gray-600"
          >
            {product.name.slice(0, 1)}
          </div>
        )}
        {(soldOut || product.stock <= LOW_STOCK) && (
          <span className="absolute left-2 top-2 rounded bg-white px-2 py-0.5 text-xs font-medium shadow">
            {soldOut ? 'Sold out' : `Only ${product.stock} left`}
          </span>
        )}
      </Link>
      <div className="flex-1 space-y-1 pt-3 text-center">
        <h2 className="line-clamp-2 text-sm font-medium">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h2>
        <p className="text-base font-bold">{formatPrice(product.priceCents)}</p>
      </div>
      {soldOut ? (
        <span className="mt-3 block rounded border border-gray-600 py-2 text-center text-sm uppercase tracking-wide text-gray-400">
          Sold out
        </span>
      ) : (
        <Link
          href={href}
          className="mt-3 block rounded bg-blue-600 py-2 text-center text-sm font-semibold uppercase tracking-wide text-white hover:bg-blue-700"
        >
          Buy
        </Link>
      )}
    </li>
  );
}
