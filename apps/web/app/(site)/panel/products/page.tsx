import Link from 'next/link';
import { bffRequest, messageOf } from '@/lib/bff';
import {
  catalogHref,
  formatPrice,
  pageCount,
  parseCatalogParams,
  type ProductPage,
} from '@/lib/catalog';
import { requireSeller } from '@/lib/guard';
import { LOW_STOCK } from '@/components/ProductCard';

export const metadata = { title: 'Manage products | Orbit Supply Co.' };
const PAGE_SIZE = 20;

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSeller('/panel/products');
  const params = parseCatalogParams(await searchParams);
  const result = await bffRequest<ProductPage>('/products', {
    query: {
      // A seller manages their own store only ("-" is never a link, so a seller without a store sees nothing).
      store: user.store?.slug ?? '-',
      q: params.q,
      sort: params.sort,
      page: String(params.page),
      pageSize: String(PAGE_SIZE),
    },
  });
  const pages = result.ok ? pageCount(result.data.total, PAGE_SIZE) : 1;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage products</h1>
        <Link
          href="/panel/products/new"
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          New product
        </Link>
      </div>

      <form
        method="get"
        action="/panel/products"
        role="search"
        className="flex gap-3"
      >
        <input
          name="q"
          defaultValue={params.q}
          aria-label="Search products"
          placeholder="Name, description or SKU"
          className="w-64 rounded border border-gray-500 bg-transparent p-2"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {!result.ok ? (
        <p role="alert" className="text-red-400">
          {messageOf(result.data, 'The products could not be loaded.')}
        </p>
      ) : result.data.items.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-gray-400">
              <tr>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Price</th>
                <th className="py-2 pr-4 text-right">Stock</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {result.data.items.map((p) => (
                <tr key={p.id} className="border-b border-gray-800">
                  <td className="py-2 pr-4 font-mono">{p.sku}</td>
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4">{p.category.name}</td>
                  <td className="py-2 pr-4 text-right">
                    {formatPrice(p.priceCents)}
                  </td>
                  <td
                    className={`py-2 pr-4 text-right ${
                      p.stock === 0
                        ? 'font-semibold text-red-400'
                        : p.stock <= LOW_STOCK
                          ? 'font-semibold text-amber-400'
                          : ''
                    }`}
                  >
                    {p.stock}
                    {p.stock === 0
                      ? ' (sold out)'
                      : p.stock <= LOW_STOCK
                        ? ' (low)'
                        : ''}
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/panel/products/${p.id}/edit`}
                      className="text-blue-400 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-between text-sm"
        >
          {params.page > 1 ? (
            <Link
              href={catalogHref(
                params,
                { page: params.page - 1 },
                '/panel/products',
              )}
              className="hover:underline"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {params.page} of {pages}
          </span>
          {params.page < pages ? (
            <Link
              href={catalogHref(
                params,
                { page: params.page + 1 },
                '/panel/products',
              )}
              className="hover:underline"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
