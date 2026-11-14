/** Turns seed/store.json into the rows of the catalog. Pure, so it can be tested without a database. */
export interface SeedFile {
  categories: { slug: string; name: string }[];
  products: {
    sku: string;
    name: string;
    description?: string;
    category: string;
    price_cents: number;
    stock: number;
  }[];
}

export function parseSeed(data: SeedFile) {
  const slugs = new Set(data.categories.map((c) => c.slug));
  for (const product of data.products) {
    if (!slugs.has(product.category)) {
      throw new Error(
        `Product ${product.sku} uses the unknown category "${product.category}"`,
      );
    }
  }
  return {
    categories: data.categories.map(({ slug, name }) => ({ slug, name })),
    products: data.products.map((p) => ({
      sku: p.sku,
      name: p.name,
      description: p.description ?? '',
      priceCents: p.price_cents,
      stock: p.stock,
      categorySlug: p.category,
    })),
  };
}
