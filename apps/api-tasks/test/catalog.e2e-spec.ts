import { randomBytes } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Runs the real application against a real PostgreSQL (DATABASE_URL), after `prisma migrate deploy`.
 * Everything it creates carries a random tag and is removed at the end, so it can share a database.
 */
describe('catalog (real database)', () => {
  const tag = randomBytes(4).toString('hex');
  const sku = (n: string) => `T${tag.toUpperCase()}-${n.toUpperCase()}`;
  const slug = (n: string) => `t${tag}-${n}`;
  const email = (n: string) => `${n}-${tag}@example.com`;
  const password = 'a-good-password';
  const prisma = new PrismaClient();
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const tokens: Record<string, string> = {};

  async function account(name: string, role: Role) {
    const res = await http()
      .post('/auth/register')
      .send({ email: email(name), password })
      .expect(201);
    expect(res.body.user.role).toBe('CUSTOMER');
    await prisma.user.update({
      where: { email: email(name) },
      data: { role },
    });
    // The role is read at login, so log in again after changing it.
    const login = await http()
      .post('/auth/login')
      .send({ email: email(name), password })
      .expect(201);
    tokens[name] = `Bearer ${login.body.accessToken}`;
  }

  const as = (name: string) => ({ Authorization: tokens[name] });

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
    await account('seller', 'SELLER');
    await account('customer', 'CUSTOMER');
  });

  afterAll(async () => {
    await prisma.product.deleteMany({
      where: { sku: { startsWith: `T${tag.toUpperCase()}-` } },
    });
    await prisma.category.deleteMany({
      where: { slug: { startsWith: `t${tag}-` } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${tag}@example.com` } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  const makeProduct = (n: string, extra: object = {}) =>
    http()
      .post('/products')
      .set(as('seller'))
      .send({
        sku: sku(n),
        name: `Item ${n}`,
        priceCents: 1000,
        stock: 5,
        categorySlug: slug('main'),
        ...extra,
      });

  describe('who may write', () => {
    it('refuses a visitor and a customer, accepts a seller', async () => {
      await http()
        .post('/categories')
        .send({ slug: slug('main'), name: 'Main' })
        .expect(401);
      await http()
        .post('/categories')
        .set(as('customer'))
        .send({ slug: slug('main'), name: 'Main' })
        .expect(403);
      await http()
        .post('/categories')
        .set(as('seller'))
        .send({ slug: slug('main'), name: 'Main' })
        .expect(201);
      await http()
        .post('/categories')
        .set(as('seller'))
        .send({ slug: slug('other'), name: 'Other' })
        .expect(201);
    });

    it('answers 409 for a duplicate category', async () => {
      await http()
        .post('/categories')
        .set(as('seller'))
        .send({ slug: slug('main'), name: 'Again' })
        .expect(409);
    });
  });

  describe('create, read, update, remove', () => {
    it('creates and reads a product with its category', async () => {
      const created = await makeProduct('one', {
        description: 'A sturdy thing',
      }).expect(201);
      expect(created.body).toMatchObject({
        sku: sku('one'),
        priceCents: 1000,
        active: true,
        category: { slug: slug('main'), name: 'Main' },
      });
      const read = await http().get(`/products/${created.body.id}`).expect(200);
      expect(read.body.id).toBe(created.body.id);
    });

    it('answers 409 for a duplicate sku and 400 for an unknown category', async () => {
      await makeProduct('one').expect(409);
      await makeProduct('two', { categorySlug: slug('nope') }).expect(400);
    });

    it('refuses a negative price or stock before the database does', async () => {
      await makeProduct('neg', { priceCents: -1 }).expect(400);
      await makeProduct('neg', { stock: -1 }).expect(400);
    });

    it('also refuses a negative stock at the database level', async () => {
      const product = await prisma.product.findUniqueOrThrow({
        where: { sku: sku('one') },
      });
      await expect(
        prisma.product.update({
          where: { id: product.id },
          data: { stock: -1 },
        }),
      ).rejects.toThrow();
    });

    it('updates fields but never the sku', async () => {
      const product = await prisma.product.findUniqueOrThrow({
        where: { sku: sku('one') },
      });
      const res = await http()
        .patch(`/products/${product.id}`)
        .set(as('seller'))
        .send({ stock: 9, priceCents: 1250, sku: 'HACK-1' })
        .expect(200);
      expect(res.body).toMatchObject({
        stock: 9,
        priceCents: 1250,
        sku: sku('one'),
      });
    });

    it('moves a product to another category', async () => {
      const product = await prisma.product.findUniqueOrThrow({
        where: { sku: sku('one') },
      });
      const res = await http()
        .patch(`/products/${product.id}`)
        .set(as('seller'))
        .send({ categorySlug: slug('other') })
        .expect(200);
      expect(res.body.category.slug).toBe(slug('other'));
      await http()
        .patch(`/products/${product.id}`)
        .set(as('seller'))
        .send({ categorySlug: slug('main') })
        .expect(200);
    });

    it('answers 404 for an unknown id and 400 for a malformed one', async () => {
      await http()
        .get('/products/00000000-0000-4000-8000-000000000000')
        .expect(404);
      await http().get('/products/nope').expect(400);
    });

    it('removing hides the product from reads and lists, but keeps the row', async () => {
      const created = await makeProduct('gone').expect(201);
      await http()
        .delete(`/products/${created.body.id}`)
        .set(as('customer'))
        .expect(403);
      await http()
        .delete(`/products/${created.body.id}`)
        .set(as('seller'))
        .expect(204);
      await http().get(`/products/${created.body.id}`).expect(404);
      const list = await http()
        .get('/products')
        .query({ q: sku('gone') })
        .expect(200);
      expect(list.body.total).toBe(0);
      const row = await prisma.product.findUnique({
        where: { id: created.body.id },
      });
      expect(row?.active).toBe(false);
    });
  });

  describe('search, filters, sort and paging', () => {
    const names: Array<[string, string, number, number]> = [
      ['a', 'Cast iron skillet', 3000, 4],
      ['b', 'Iron garden fork', 1500, 0],
      ['c', 'Bamboo board', 800, 12],
      ['d', '100% cotton towel', 500, 3],
      ['e', '100 plain towel', 400, 3],
    ];

    beforeAll(async () => {
      for (const [n, name, priceCents, stock] of names) {
        await makeProduct(`s${n}`, { name, priceCents, stock }).expect(201);
      }
    });

    interface Page {
      items: { sku: string; name: string; priceCents: number }[];
      total: number;
    }
    const search = async (query: object): Promise<{ body: Page }> => {
      const res = await http()
        .get('/products')
        .query({ category: slug('main'), ...query })
        .expect(200);
      return { body: res.body as Page };
    };
    const found = (body: { items: { sku: string }[] }) =>
      body.items.map((i) => i.sku.split('-')[1].toLowerCase());

    it('finds products when every word matches, in any case', async () => {
      expect(found((await search({ q: 'IRON skillet' })).body)).toEqual(['sa']);
      expect(found((await search({ q: 'iron' })).body).sort()).toEqual([
        'sa',
        'sb',
      ]);
    });

    it('treats % and _ as plain text', async () => {
      expect(found((await search({ q: '100%' })).body)).toEqual(['sd']);
      expect(found((await search({ q: '_' })).body)).toEqual([]);
    });

    it('searches the description and the sku too', async () => {
      expect(found((await search({ q: 'sturdy' })).body)).toEqual(['one']);
      expect(found((await search({ q: sku('sc') })).body)).toEqual(['sc']);
    });

    it('filters by stock', async () => {
      const inStock = found((await search({ inStock: 'true' })).body);
      expect(inStock).not.toContain('sb');
      expect(found((await search({ inStock: 'false' })).body)).toEqual(['sb']);
    });

    it('filters by category', async () => {
      const res = await http()
        .get('/products')
        .query({ category: slug('other') })
        .expect(200);
      expect(res.body.total).toBe(0);
    });

    it('sorts by price and by name', async () => {
      const asc = found((await search({ sort: 'price_asc', q: 'o' })).body);
      const prices = (
        await search({ sort: 'price_asc', q: 'o' })
      ).body.items.map((i: { priceCents: number }) => i.priceCents);
      expect(asc.length).toBeGreaterThan(2);
      expect(prices).toEqual([...prices].sort((x, y) => x - y));
      const desc = (await search({ sort: 'price_desc' })).body.items.map(
        (i: { priceCents: number }) => i.priceCents,
      );
      expect(desc).toEqual([...desc].sort((x, y) => y - x));
      const byName = (
        await search({ sort: 'name', pageSize: 100 })
      ).body.items.map((i: { sku: string }) => i.sku);
      // The order of names belongs to the database collation, so ask the database for it.
      const expected = await prisma.product.findMany({
        where: { active: true, category: { slug: slug('main') } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { sku: true },
      });
      expect(byName).toEqual(expected.map((p) => p.sku));
    });

    it('pages without overlap or gaps', async () => {
      const all = (await search({ pageSize: 100 })).body;
      const seen: string[] = [];
      for (let page = 1; page <= all.total; page++) {
        const res = await search({ pageSize: 1, page, sort: 'price_asc' });
        expect(res.body.total).toBe(all.total);
        seen.push(res.body.items[0].sku);
      }
      expect(new Set(seen).size).toBe(all.total);
      const beyond = await search({ pageSize: 1, page: all.total + 1 });
      expect(beyond.body.items).toEqual([]);
    });

    it('refuses a page size above 100', async () => {
      await http().get('/products').query({ pageSize: 101 }).expect(400);
    });
  });
});
