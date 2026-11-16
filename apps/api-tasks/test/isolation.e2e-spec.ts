import { randomBytes } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestSeller, removeTestData, sellerWithStore } from './support';

/**
 * A seller never reads or changes anything of another store. Two sellers, two stores and two customers
 * on a real PostgreSQL; everything carries a random tag and is removed at the end.
 */
describe('store isolation (real database)', () => {
  const tag = randomBytes(4).toString('hex');
  const password = 'a-good-password';
  const prisma = new PrismaClient();
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const bearer: Record<string, string> = {};
  let alpha: TestSeller;
  let beta: TestSeller;
  let categoryId: string;
  const product: Record<string, string> = {};
  const as = (name: string) => ({ Authorization: bearer[name] });

  async function customer(name: string) {
    const res = await http()
      .post('/auth/register')
      .send({ email: `${name}-${tag}@example.com`, password })
      .expect(201);
    bearer[name] = `Bearer ${res.body.accessToken as string}`;
  }

  async function staff(name: string, role: 'ADMIN' | 'SELLER') {
    const email = `${name}-${tag}@example.com`;
    await http().post('/auth/register').send({ email, password }).expect(201);
    await prisma.user.update({ where: { email }, data: { role } });
    const login = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    bearer[name] = `Bearer ${login.body.accessToken as string}`;
  }

  const create = (seller: TestSeller, sku: string, extra: object = {}) =>
    http()
      .post('/products')
      .set({ Authorization: seller.token })
      .send({
        sku: `I${tag.toUpperCase()}-${sku}`,
        name: `Item ${sku}`,
        priceCents: 500,
        stock: 10,
        categorySlug: `i${tag}`,
        ...extra,
      });

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'an-integration-test-secret-1234567890';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    categoryId = (
      await prisma.category.create({
        data: { slug: `i${tag}`, name: 'Isolation tests' },
      })
    ).id;
    alpha = await sellerWithStore(app, tag, 'alpha');
    beta = await sellerWithStore(app, tag, 'beta');
    bearer.alpha = alpha.token;
    bearer.beta = beta.token;
    await customer('ana');
    await customer('bob');
    await staff('root', 'ADMIN');
    await staff('nostore', 'SELLER');
    product.a = (await create(alpha, 'A').expect(201)).body.id as string;
    product.b = (await create(beta, 'B').expect(201)).body.id as string;
  });

  afterAll(async () => {
    await removeTestData(prisma, tag, `I${tag.toUpperCase()}-`);
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('products', () => {
    it('puts a new product in the store of the seller, whatever the body says', async () => {
      const res = await create(beta, 'C', { storeId: alpha.storeId }).expect(
        201,
      );
      expect(res.body.store.slug).toBe(beta.slug);
      const row = await prisma.product.findUniqueOrThrow({
        where: { id: res.body.id as string },
      });
      expect(row.storeId).toBe(beta.storeId);
    });

    it("refuses to change or remove another store's product, and changes nothing", async () => {
      await http()
        .patch(`/products/${product.a}`)
        .set(as('beta'))
        .send({ priceCents: 1, stock: 0 })
        .expect(404);
      await http().delete(`/products/${product.a}`).set(as('beta')).expect(404);
      const row = await prisma.product.findUniqueOrThrow({
        where: { id: product.a },
      });
      expect(row).toMatchObject({ priceCents: 500, stock: 10, active: true });
    });

    it('lets each seller change their own product', async () => {
      await http()
        .patch(`/products/${product.a}`)
        .set(as('alpha'))
        .send({ stock: 8 })
        .expect(200);
    });

    it('lists each store apart, and lets two stores use the same SKU', async () => {
      await create(beta, 'A').expect(201);
      const inAlpha = await http()
        .get(`/products?store=${alpha.slug}&pageSize=100`)
        .expect(200);
      const skus = (inAlpha.body.items as { sku: string }[]).map((p) => p.sku);
      expect(skus).toEqual([`I${tag.toUpperCase()}-A`]);
      const inBeta = await http()
        .get(`/products?store=${beta.slug}&pageSize=100`)
        .expect(200);
      expect(inBeta.body.total).toBe(3);
    });

    it('gives a seller without a store, an admin and a customer no way to write', async () => {
      for (const name of ['nostore', 'root', 'ana']) {
        const res = await http()
          .post('/products')
          .set(as(name))
          .send({
            sku: `I${tag.toUpperCase()}-Z`,
            name: 'Z',
            priceCents: 1,
            stock: 1,
            categorySlug: `i${tag}`,
          });
        expect(res.status).toBe(403);
      }
    });
  });

  describe('cart', () => {
    const add = (name: string, store: TestSeller, productId: string) =>
      http()
        .post(`/cart/items?store=${store.slug}`)
        .set(as(name))
        .send({ productId, quantity: 1 });

    it("does not take another store's product into a cart", async () => {
      await add('ana', alpha, product.b).expect(404);
      await add('ana', beta, product.a).expect(404);
    });

    it('keeps one cart per store for the same customer', async () => {
      await add('ana', alpha, product.a).expect(201);
      await add('ana', beta, product.b).expect(201);
      const inAlpha = await http()
        .get(`/cart?store=${alpha.slug}`)
        .set(as('ana'))
        .expect(200);
      const inBeta = await http()
        .get(`/cart?store=${beta.slug}`)
        .set(as('ana'))
        .expect(200);
      const ids = (body: { items: { productId: string }[] }) =>
        body.items.map((i) => i.productId);
      expect(ids(inAlpha.body as never)).toEqual([product.a]);
      expect(ids(inBeta.body as never)).toEqual([product.b]);
    });

    it('answers 404 for a store link that does not exist and 400 without one', async () => {
      await http().get('/cart?store=nowhere-land').set(as('ana')).expect(404);
      await http().get('/cart').set(as('ana')).expect(400);
    });

    it('lets a seller shop in another store, but gives admins no cart and no order', async () => {
      await http().get(`/cart?store=${alpha.slug}`).set(as('beta')).expect(200);
      for (const name of ['root']) {
        await http().get(`/cart?store=${alpha.slug}`).set(as(name)).expect(403);
        await add(name, alpha, product.a).expect(403);
        await http()
          .post(`/orders?store=${alpha.slug}`)
          .set(as(name))
          .expect(403);
      }
    });
  });

  describe('orders', () => {
    let orderId: string;

    beforeAll(async () => {
      const res = await http()
        .post(`/orders?store=${alpha.slug}`)
        .set(as('ana'))
        .expect(201);
      orderId = res.body.id as string;
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
    });

    it('belongs to the store of the cart it came from, and leaves the other cart alone', async () => {
      const row = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.storeId).toBe(alpha.storeId);
      const other = await http()
        .get(`/cart?store=${beta.slug}`)
        .set(as('ana'))
        .expect(200);
      expect(other.body.itemCount).toBe(1);
    });

    it('is visible to its owner, the seller of its store and an admin, and to nobody else', async () => {
      for (const name of ['ana', 'alpha', 'root']) {
        await http().get(`/orders/${orderId}`).set(as(name)).expect(200);
      }
      for (const name of ['beta', 'bob', 'nostore']) {
        const res = await http().get(`/orders/${orderId}`).set(as(name));
        expect([403, 404]).toContain(res.status);
      }
      await http().get(`/orders/${orderId}`).set(as('beta')).expect(404);
      await http().get(`/orders/${orderId}`).set(as('bob')).expect(404);
    });

    it("refuses the other store's seller to ship, deliver or cancel it, and changes nothing", async () => {
      for (const action of ['ship', 'deliver', 'cancel']) {
        await http()
          .post(`/orders/${orderId}/${action}`)
          .set(as('beta'))
          .expect(404);
      }
      const row = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.status).toBe('PAID');
      expect(row.shippedAt).toBeNull();
    });

    it('lets the seller of the store ship and deliver it', async () => {
      await http().post(`/orders/${orderId}/ship`).set(as('alpha')).expect(201);
      await http()
        .post(`/orders/${orderId}/deliver`)
        .set(as('alpha'))
        .expect(201);
      const row = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.status).toBe('DELIVERED');
    });
  });
});
