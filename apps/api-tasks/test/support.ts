import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

const PASSWORD = 'a-good-password';

export interface TestSeller {
  token: string;
  userId: string;
  storeId: string;
  slug: string;
}

/** Signs a seller up through the API, which creates the store too, and logs in. The e-mail ends with the tag. */
export async function sellerWithStore(
  app: INestApplication,
  tag: string,
  name: string,
): Promise<TestSeller> {
  const email = `${name}-${tag}@example.com`;
  const slug = `s${tag}-${name}`;
  const reg = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      password: PASSWORD,
      accountType: 'SELLER',
      storeName: `Store ${name}`,
      storeSlug: slug,
    })
    .expect(201);
  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: PASSWORD })
    .expect(201);
  return {
    token: `Bearer ${login.body.accessToken as string}`,
    userId: reg.body.user.id as string,
    storeId: reg.body.store.id as string,
    slug,
  };
}

/**
 * Removes what a test run created, in the order the foreign keys need: orders, carts, products,
 * stores, then the users. Everything is found through the tag in the e-mail or the SKU prefix.
 */
export async function removeTestData(
  prisma: PrismaClient,
  tag: string,
  skuPrefix: string,
) {
  const user = { email: { endsWith: `-${tag}@example.com` } };
  await prisma.order.deleteMany({ where: { user } });
  await prisma.cart.deleteMany({ where: { user } });
  await prisma.product.deleteMany({
    where: { sku: { startsWith: skuPrefix } },
  });
  await prisma.store.deleteMany({ where: { owner: user } });
  await prisma.user.deleteMany({ where: user });
}
