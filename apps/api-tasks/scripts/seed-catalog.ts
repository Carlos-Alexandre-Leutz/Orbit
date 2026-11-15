/**
 * Loads the fictional store of seed/store.json (categories and products) into the database.
 * Safe to run again: rows are matched by slug or SKU and updated, nothing is duplicated.
 *
 *   pnpm --filter @orbit/api-tasks seed:catalog            (uses DATABASE_URL)
 *   SEED_FILE=/path/store.json pnpm --filter @orbit/api-tasks seed:catalog
 *   SEED_STORE=<store slug> to load into another store (default: demo-store)
 *
 * The demo users of the seed file are not loaded: they have no passwords.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { parseSeed, SeedFile } from '../src/catalog/seed';

async function main() {
  const file = resolve(
    process.env.SEED_FILE ?? resolve(__dirname, '../../../seed/store.json'),
  );
  const seed = parseSeed(JSON.parse(readFileSync(file, 'utf-8')) as SeedFile);
  const prisma = new PrismaClient();
  try {
    // The demo catalog belongs to the demo store that the store migration creates.
    const store = await prisma.store.findUnique({
      where: { slug: process.env.SEED_STORE ?? 'demo-store' },
    });
    if (!store) {
      throw new Error(
        'The store to load into does not exist; run the migrations or set SEED_STORE',
      );
    }
    const ids = new Map<string, string>();
    for (const category of seed.categories) {
      const row = await prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category,
      });
      ids.set(row.slug, row.id);
    }
    for (const { categorySlug, ...product } of seed.products) {
      const data = {
        ...product,
        categoryId: ids.get(categorySlug) as string,
        storeId: store.id,
      };
      await prisma.product.upsert({
        where: { storeId_sku: { storeId: store.id, sku: product.sku } },
        update: data,
        create: data,
      });
    }
    console.log(
      `Loaded ${seed.categories.length} categories and ${seed.products.length} products from ${file} into the store ${store.slug}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
