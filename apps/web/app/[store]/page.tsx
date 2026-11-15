import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { bffRequest, messageOf } from '@/lib/bff';
import {
  PAGE_SIZE,
  SORTS,
  catalogHref,
  pageCount,
  parseCatalogParams,
  type Category,
  type ProductPage,
} from '@/lib/catalog';
import { getStore } from '@/lib/stores';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const store = await getStore((await params).store);
  return { title: store ? `${store.name} | Orbit` : 'Store not found | Orbit' };
}

export default async function StorePage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { store: slug } = await routeParams;
  const store = await getStore(slug);
  if (!store) notFound();
  const base = `/${store.slug}`;
  const params = parseCatalogParams(await searchParams);
  const [products, categories] = await Promise.all([
    bffRequest<ProductPage>('/products', {
      query: {
        store: store.slug,
        q: params.q,
        category: params.category,
        inStock: params.inStock ? 'true' : undefined,
        sort: params.sort,
        page: String(params.page),
        pageSize: String(PAGE_SIZE),
      },
    }),
    bffRequest<Category[]>('/categories'),
  ]);

  const pages = products.ok ? pageCount(products.data.total, PAGE_SIZE) : 1;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{store.name}</h1>
        {store.description && (
          <p className="text-gray-400">{store.description}</p>
        )}
      </div>

      <form
        method="get"
        action={base}
        className="flex flex-wrap items-end gap-3"
        role="search"
      >
        <label className="flex flex-col text-sm">
          Search
          <input
            name="q"
            defaultValue={params.q}
            maxLength={100}
            placeholder="Name, description or SKU"
            className="w-64 rounded border border-gray-500 bg-transparent p-2"
          />
        </label>
        <label className="flex flex-col text-sm">
          Category
          <select
            name="category"
            defaultValue={params.category}
            className="rounded border border-gray-500 bg-transparent p-2"
          >
            <option value="">All</option>
            {categories.ok &&
              categories.data.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Sort by
          <select
            name="sort"
            defaultValue={params.sort}
            className="rounded border border-gray-500 bg-transparent p-2"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="inStock"
            value="true"
            defaultChecked={params.inStock}
          />
          In stock only
        </label>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Search
        </button>
        <Link
          href={base}
          className="pb-2 text-sm text-blue-400 hover:underline"
        >
          Clear
        </Link>
      </form>

      {!products.ok ? (
        <p role="alert" className="text-red-400">
          {messageOf(products.data, 'The catalog could not be loaded.')}
        </p>
      ) : products.data.items.length === 0 ? (
        <p>
          {params.q || params.category || params.inStock
            ? 'No products match your search.'
            : 'This store has no products yet.'}
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            {products.data.total} product{products.data.total === 1 ? '' : 's'}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        </>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-between text-sm"
        >
          {params.page > 1 ? (
            <Link
              href={catalogHref(params, { page: params.page - 1 }, base)}
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
              href={catalogHref(params, { page: params.page + 1 }, base)}
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
