import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { BenefitsStrip } from '@/components/BenefitsStrip';
import { StoreHero } from '@/components/StoreHero';
import { bffRequest, messageOf } from '@/lib/bff';
import {
  PAGE_SIZE,
  SORTS,
  catalogHref,
  pageCount,
  parseCatalogParams,
  type ProductPage,
} from '@/lib/catalog';
import { getStore, getStoreCategories } from '@/lib/stores';
import { GRID_CLASS, templateOf } from '@/lib/templates';

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
    getStoreCategories(store.slug),
  ]);

  const pages = products.ok ? pageCount(products.data.total, PAGE_SIZE) : 1;

  const categoryName = categories.find((c) => c.slug === params.category)?.name;
  const title = params.q
    ? `Results for “${params.q}”`
    : (categoryName ?? 'Our products');

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6">
      <StoreHero store={store} />
      <BenefitsStrip store={store} />

      {categories.length > 0 && (
        <section aria-label="Categories" className="space-y-4">
          <h2 className="text-center text-2xl font-bold">Shop by category</h2>
          <ul className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={catalogHref(
                    params,
                    { category: category.slug, page: 1 },
                    base,
                  )}
                  className={`block rounded-full border px-6 py-2 text-sm font-medium hover:bg-gray-800 ${params.category === category.slug ? 'border-gray-300 bg-gray-800' : 'border-gray-600'}`}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label={title} className="space-y-5">
        <h2 className="text-center text-2xl font-bold">{title}</h2>

        <form
          method="get"
          action={base}
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          {params.q && <input type="hidden" name="q" value={params.q} />}
          {params.category && (
            <input type="hidden" name="category" value={params.category} />
          )}
          <p className="text-gray-400">
            {products.ok
              ? `${products.data.total} product${products.data.total === 1 ? '' : 's'}`
              : ''}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              Sort by
              <select
                name="sort"
                defaultValue={params.sort}
                className="rounded border border-gray-600 bg-transparent p-1.5"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
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
              className="rounded border border-gray-600 px-3 py-1.5 hover:bg-gray-800"
            >
              Apply
            </button>
            {(params.q || params.category || params.inStock) && (
              <Link href={base} className="text-blue-400 hover:underline">
                Clear
              </Link>
            )}
          </div>
        </form>

        {!products.ok ? (
          <p role="alert" className="text-red-400">
            {messageOf(products.data, 'The catalog could not be loaded.')}
          </p>
        ) : products.data.items.length === 0 ? (
          <p className="py-10 text-center text-gray-400">
            {params.q || params.category || params.inStock
              ? 'No products match your search.'
              : 'This store has no products yet.'}
          </p>
        ) : (
          <ul className={GRID_CLASS[templateOf(store.template)]}>
            {products.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
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
      </section>
    </main>
  );
}
