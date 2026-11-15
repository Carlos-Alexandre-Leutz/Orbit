import { randomBytes } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { demoStoreId } from './support';

interface CartBody {
  items: {
    productId: string;
    quantity: number;
    available: boolean;
    lineTotalCents: number;
  }[];
  itemCount: number;
  totalCents: number;
}

/** The cart on a real PostgreSQL. Everything it creates carries a random tag and is removed at the end. */
describe('cart (real database)', () => {
  const tag = randomBytes(4).toString('hex');
  const prisma = new PrismaClient();
  const password = 'a-good-password';
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const bearer: Record<string, string> = {};
  const products: Record<string, string> = {};

  async function register(name: string) {
    const res = await http()
      .post('/auth/register')
      .send({ email: `${name}-${tag}@example.com`, password })
      .expect(201);
    bearer[name] = `Bearer ${res.body.accessToken as string}`;
  }
  const as = (name: string) => ({ Authorization: bearer[name] });
  const cartOf = async (name: string) =>
    (await http().get('/cart').set(as(name)).expect(200)).body as CartBody;

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
    await register('ana');
    await register('bob');
    const category = await prisma.category.create({
      data: { slug: `c${tag}`, name: 'Cart tests' },
    });
    for (const [key, price, stock] of [
      ['a', 1000, 50],
      ['b', 250, 50],
    ] as const) {
      const product = await prisma.product.create({
        data: {
          storeId: await demoStoreId(prisma),
          sku: `C${tag.toUpperCase()}-${key.toUpperCase()}`,
          name: `Cart item ${key}`,
          priceCents: price,
          stock,
          categoryId: category.id,
        },
      });
      products[key] = product.id;
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${tag}@example.com` } },
    });
    await prisma.product.deleteMany({
      where: { sku: { startsWith: `C${tag.toUpperCase()}-` } },
    });
    await prisma.category.deleteMany({ where: { slug: `c${tag}` } });
    await prisma.$disconnect();
    await app.close();
  });

  it('is empty for a user who never added anything', async () => {
    expect(await cartOf('ana')).toEqual({
      items: [],
      itemCount: 0,
      totalCents: 0,
    });
  });

  it('adds products, sums repeated adds and totals the lines', async () => {
    await http()
      .post('/cart/items')
      .set(as('ana'))
      .send({ productId: products.a, quantity: 2 })
      .expect(201);
    await http()
      .post('/cart/items')
      .set(as('ana'))
      .send({ productId: products.a, quantity: 1 })
      .expect(201);
    await http()
      .post('/cart/items')
      .set(as('ana'))
      .send({ productId: products.b, quantity: 4 })
      .expect(201);
    const cart = await cartOf('ana');
    expect(cart.items).toHaveLength(2);
    expect(cart.items.find((i) => i.productId === products.a)?.quantity).toBe(
      3,
    );
    expect(cart.itemCount).toBe(7);
    expect(cart.totalCents).toBe(3 * 1000 + 4 * 250);
  });

  it('keeps every user in their own cart', async () => {
    expect((await cartOf('bob')).items).toEqual([]);
    await http()
      .post('/cart/items')
      .set(as('bob'))
      .send({ productId: products.b, quantity: 1 })
      .expect(201);
    expect((await cartOf('bob')).itemCount).toBe(1);
    expect((await cartOf('ana')).itemCount).toBe(7);
    await http().delete('/cart').set(as('bob')).expect(204);
    expect((await cartOf('ana')).itemCount).toBe(7);
  });

  it('sets a quantity, and doing it again changes nothing', async () => {
    const first = await http()
      .patch(`/cart/items/${products.a}`)
      .set(as('ana'))
      .send({ quantity: 5 })
      .expect(200);
    const second = await http()
      .patch(`/cart/items/${products.a}`)
      .set(as('ana'))
      .send({ quantity: 5 })
      .expect(200);
    expect(second.body).toEqual(first.body);
    expect(
      (first.body as CartBody).items.find((i) => i.productId === products.a)
        ?.quantity,
    ).toBe(5);
  });

  it('answers 404 for a product that does not exist or a line that is not in the cart', async () => {
    const ghost = '00000000-0000-4000-8000-000000000000';
    await http()
      .post('/cart/items')
      .set(as('ana'))
      .send({ productId: ghost, quantity: 1 })
      .expect(404);
    await http()
      .patch(`/cart/items/${ghost}`)
      .set(as('ana'))
      .send({ quantity: 1 })
      .expect(404);
  });

  it('flags a product that was removed and leaves it out of the total', async () => {
    await prisma.product.update({
      where: { id: products.b },
      data: { active: false },
    });
    const cart = await cartOf('ana');
    expect(cart.items.find((i) => i.productId === products.b)?.available).toBe(
      false,
    );
    expect(cart.totalCents).toBe(5 * 1000);
    await prisma.product.update({
      where: { id: products.b },
      data: { active: true },
    });
  });

  it('removes a line and empties the cart', async () => {
    await http().delete(`/cart/items/${products.b}`).set(as('ana')).expect(204);
    expect((await cartOf('ana')).items.map((i) => i.productId)).toEqual([
      products.a,
    ]);
    await http().delete('/cart').set(as('ana')).expect(204);
    expect(await cartOf('ana')).toEqual({
      items: [],
      itemCount: 0,
      totalCents: 0,
    });
  });

  it('works for a temporary visitor', async () => {
    const res = await http().post('/auth/anonymous').expect(201);
    const visitor = {
      Authorization: `Bearer ${res.body.accessToken as string}`,
    };
    await http()
      .post('/cart/items')
      .set(visitor)
      .send({ productId: products.a, quantity: 1 })
      .expect(201);
    const cart = (await http().get('/cart').set(visitor).expect(200))
      .body as CartBody;
    expect(cart.itemCount).toBe(1);
    await prisma.user.delete({ where: { id: res.body.user.id as string } });
  });

  it('refuses a session-less request and a database-level zero quantity', async () => {
    await http().get('/cart').expect(401);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: `ana-${tag}@example.com` },
    });
    const cart = await prisma.cart.findUniqueOrThrow({
      where: { userId: user.id },
    });
    await expect(
      prisma.cartItem.create({
        data: { cartId: cart.id, productId: products.a, quantity: 0 },
      }),
    ).rejects.toThrow();
  });

  describe('the rules, on real data', () => {
    const give = (name: string, productId: string, quantity: number) =>
      http().post('/cart/items').set(as(name)).send({ productId, quantity });

    it('never lets the cart hold more units than the stock', async () => {
      const scarce = await prisma.product.create({
        data: {
          storeId: await demoStoreId(prisma),
          sku: `C${tag.toUpperCase()}-SCARCE`,
          name: 'Scarce',
          priceCents: 100,
          stock: 3,
          categoryId: (
            await prisma.category.findUniqueOrThrow({
              where: { slug: `c${tag}` },
            })
          ).id,
        },
      });
      await give('bob', scarce.id, 2).expect(201);
      const refused = await give('bob', scarce.id, 2).expect(409);
      expect(refused.body).toMatchObject({ code: 'NOT_ENOUGH_STOCK' });
      expect(refused.body.message).toContain('3');
      await http()
        .patch(`/cart/items/${scarce.id}`)
        .set(as('bob'))
        .send({ quantity: 4 })
        .expect(409);
      expect((await cartOf('bob')).itemCount).toBe(2);
      await http().delete('/cart').set(as('bob')).expect(204);
    });

    it('refuses more than 10 units of one product', async () => {
      await give('bob', products.a, 10).expect(201);
      const refused = await give('bob', products.a, 1).expect(409);
      expect(refused.body).toMatchObject({ code: 'TOO_MANY_UNITS' });
      await http().delete('/cart').set(as('bob')).expect(204);
    });

    it('refuses a product that was removed or has no stock, and leaves the cart as it was', async () => {
      const gone = await prisma.product.create({
        data: {
          storeId: await demoStoreId(prisma),
          sku: `C${tag.toUpperCase()}-GONE`,
          name: 'Gone',
          priceCents: 100,
          stock: 5,
          active: false,
          categoryId: (
            await prisma.category.findUniqueOrThrow({
              where: { slug: `c${tag}` },
            })
          ).id,
        },
      });
      expect((await give('bob', gone.id, 1).expect(409)).body).toMatchObject({
        code: 'UNAVAILABLE',
      });
      await prisma.product.update({
        where: { id: gone.id },
        data: { active: true, stock: 0 },
      });
      expect((await give('bob', gone.id, 1).expect(409)).body).toMatchObject({
        code: 'OUT_OF_STOCK',
      });
      expect((await cartOf('bob')).items).toEqual([]);
    });

    it('holds at most 20 different products', async () => {
      const category = await prisma.category.findUniqueOrThrow({
        where: { slug: `c${tag}` },
      });
      const ids: string[] = [];
      for (let i = 0; i < 21; i++) {
        const p = await prisma.product.create({
          data: {
            storeId: await demoStoreId(prisma),
            sku: `C${tag.toUpperCase()}-MANY${i}`,
            name: `Many ${i}`,
            priceCents: 100,
            stock: 5,
            categoryId: category.id,
          },
        });
        ids.push(p.id);
      }
      for (const id of ids.slice(0, 20)) await give('bob', id, 1).expect(201);
      expect((await give('bob', ids[20], 1).expect(409)).body).toMatchObject({
        code: 'TOO_MANY_PRODUCTS',
      });
      await http()
        .patch(`/cart/items/${ids[0]}`)
        .set(as('bob'))
        .send({ quantity: 2 })
        .expect(200);
      await http().delete('/cart').set(as('bob')).expect(204);
    });

    it('is safe against parallel requests: 15 adds of one unit end at the limit of 10', async () => {
      const results = await Promise.all(
        Array.from({ length: 15 }, () => give('bob', products.a, 1)),
      );
      const statuses = results.map((r) => r.status);
      expect(statuses.filter((s) => s === 201)).toHaveLength(10);
      expect(statuses.filter((s) => s === 409)).toHaveLength(5);
      expect((await cartOf('bob')).items[0].quantity).toBe(10);
      await http().delete('/cart').set(as('bob')).expect(204);
    });
  });

  describe('the very first requests of a new user', () => {
    it('create one cart between them: 12 parallel adds from a user with no cart all work', async () => {
      await register('eve');
      const results = await Promise.all(
        Array.from({ length: 12 }, () =>
          http()
            .post('/cart/items')
            .set(as('eve'))
            .send({ productId: products.b, quantity: 1 }),
        ),
      );
      const statuses = results.map((r) => r.status);
      // 10 units fit; the rest are refused by the rule, never by a crash.
      expect(statuses.filter((s) => s === 201)).toHaveLength(10);
      expect(statuses.filter((s) => s === 409)).toHaveLength(2);
      expect(statuses.filter((s) => s >= 500)).toHaveLength(0);
      expect((await cartOf('eve')).items[0].quantity).toBe(10);
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: `eve-${tag}@example.com` },
      });
      expect(await prisma.cart.count({ where: { userId: user.id } })).toBe(1);
    });
  });
});
