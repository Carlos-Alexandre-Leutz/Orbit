import { randomBytes } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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
});
