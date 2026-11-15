import { PrismaClient } from '@prisma/client';

/** The store that the store migration creates for the demo catalog; tests that need "a store" use it. */
export async function demoStoreId(prisma: PrismaClient) {
  const store = await prisma.store.findUniqueOrThrow({
    where: { slug: 'demo-store' },
  });
  return store.id;
}
