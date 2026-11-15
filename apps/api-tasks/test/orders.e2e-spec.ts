import { randomBytes } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

interface OrderBody {
  id: string;
  status: string;
  totalCents: number;
  items: {
    productId: string;
    sku: string;
    name: string;
    priceCents: number;
    quantity: number;
  }[];
}

/** Orders on a real PostgreSQL. Everything it creates carries a random tag and is removed at the end. */
describe('orders (real database)', () => {
  const tag = randomBytes(4).toString('hex');
  const prisma = new PrismaClient();
  const password = 'a-good-password';
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const bearer: Record<string, string> = {};
  const userId: Record<string, string> = {};
  const products: Record<string, string> = {};
  let categoryId: string;

  async function account(name: string, role: Role = 'CUSTOMER') {
    const email = `${name}-${tag}@example.com`;
    const reg = await http()
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
    userId[name] = reg.body.user.id as string;
    if (role !== 'CUSTOMER') {
      await prisma.user.update({ where: { email }, data: { role } });
      const login = await http()
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      bearer[name] = `Bearer ${login.body.accessToken as string}`;
    } else {
      bearer[name] = `Bearer ${reg.body.accessToken as string}`;
    }
  }
  const as = (name: string) => ({ Authorization: bearer[name] });
  const addToCart = (name: string, productId: string, quantity: number) =>
    http().post('/cart/items').set(as(name)).send({ productId, quantity });
  const place = (name: string, key?: string) => {
    const req = http().post('/orders').set(as(name));
    return key ? req.set('Idempotency-Key', key) : req;
  };
  const stockOf = async (productId: string) =>
    (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
      .stock;
  const newProduct = async (key: string, priceCents: number, stock: number) => {
    const p = await prisma.product.create({
      data: {
        sku: `O${tag.toUpperCase()}-${key.toUpperCase()}`,
        name: `Order item ${key}`,
        priceCents,
        stock,
        categoryId,
      },
    });
    products[key] = p.id;
    return p.id;
  };

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
        data: { slug: `o${tag}`, name: 'Order tests' },
      })
    ).id;
    await newProduct('a', 1000, 20);
    await newProduct('b', 250, 20);
    for (const [name, role] of [
      ['ana', 'CUSTOMER'],
      ['bob', 'CUSTOMER'],
      ['cy', 'CUSTOMER'],
      ['sam', 'SELLER'],
      ['root', 'ADMIN'],
    ] as const) {
      await account(name, role);
    }
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: `-${tag}@example.com` } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.order.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.product.deleteMany({
      where: { sku: { startsWith: `O${tag.toUpperCase()}-` } },
    });
    await prisma.category.deleteMany({ where: { slug: `o${tag}` } });
    await prisma.$disconnect();
    await app.close();
  });

  it('refuses an empty cart, with a code', async () => {
    const res = await place('ana').expect(409);
    expect(res.body).toMatchObject({ code: 'EMPTY_CART' });
  });

  describe('placing an order', () => {
    let order: OrderBody;
    let stockBefore: number;

    it('copies the products and prices, totals them, takes the stock and empties the cart', async () => {
      stockBefore = await stockOf(products.a);
      await addToCart('ana', products.a, 3).expect(201);
      await addToCart('ana', products.b, 4).expect(201);
      const res = await place('ana').expect(201);
      order = res.body as OrderBody;
      expect(order.status).toBe('PENDING_PAYMENT');
      expect(order.totalCents).toBe(3 * 1000 + 4 * 250);
      expect(order.items).toHaveLength(2);
      expect(order.items.find((i) => i.productId === products.a)).toMatchObject(
        {
          priceCents: 1000,
          quantity: 3,
          sku: `O${tag.toUpperCase()}-A`,
        },
      );
      expect(await stockOf(products.a)).toBe(stockBefore - 3);
      const cart = await http().get('/cart').set(as('ana')).expect(200);
      expect(cart.body.items).toEqual([]);
    });

    it('keeps the order as it was bought when the price changes later', async () => {
      await prisma.product.update({
        where: { id: products.a },
        data: { priceCents: 5000, name: 'Renamed' },
      });
      const res = await http()
        .get(`/orders/${order.id}`)
        .set(as('ana'))
        .expect(200);
      expect(res.body.totalCents).toBe(3 * 1000 + 4 * 250);
      expect(
        (res.body.items as OrderBody['items']).find(
          (i: { productId: string }) => i.productId === products.a,
        ),
      ).toMatchObject({
        priceCents: 1000,
        name: 'Order item a',
      });
      await prisma.product.update({
        where: { id: products.a },
        data: { priceCents: 1000, name: 'Order item a' },
      });
    });

    it('lists my orders, newest first, and only mine', async () => {
      const mine = await http().get('/orders').set(as('ana')).expect(200);
      expect((mine.body as OrderBody[]).map((o) => o.id)).toEqual([order.id]);
      expect(
        (await http().get('/orders').set(as('bob')).expect(200)).body,
      ).toEqual([]);
    });

    it('shows the order to its owner and to an admin, and to nobody else', async () => {
      await http().get(`/orders/${order.id}`).set(as('root')).expect(200);
      await http().get(`/orders/${order.id}`).set(as('bob')).expect(404);
      await http().get(`/orders/${order.id}`).set(as('sam')).expect(404);
      await http().get(`/orders/${order.id}`).expect(401);
    });

    it('moves through shipping and delivery only in order, and only by a seller or admin', async () => {
      await http().post(`/orders/${order.id}/ship`).set(as('sam')).expect(409);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });
      await http().post(`/orders/${order.id}/ship`).set(as('ana')).expect(403);
      await http()
        .post(`/orders/${order.id}/deliver`)
        .set(as('sam'))
        .expect(409);
      const shipped = await http()
        .post(`/orders/${order.id}/ship`)
        .set(as('sam'))
        .expect(201);
      expect(shipped.body.status).toBe('SHIPPED');
      expect(shipped.body.shippedAt).toBeTruthy();
      await http().post(`/orders/${order.id}/ship`).set(as('sam')).expect(409);
      const delivered = await http()
        .post(`/orders/${order.id}/deliver`)
        .set(as('root'))
        .expect(201);
      expect(delivered.body.status).toBe('DELIVERED');
      await http().post(`/orders/${order.id}/ship`).set(as('sam')).expect(409);
    });

    it('lets only one of two parallel ship requests win', async () => {
      await addToCart('ana', products.b, 1).expect(201);
      const fresh = (await place('ana').expect(201)).body as OrderBody;
      await prisma.order.update({
        where: { id: fresh.id },
        data: { status: 'PAID' },
      });
      const results = await Promise.all([
        http().post(`/orders/${fresh.id}/ship`).set(as('sam')),
        http().post(`/orders/${fresh.id}/ship`).set(as('root')),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    });
  });

  describe('stock', () => {
    it('refuses an order when the stock fell below the cart, and changes nothing', async () => {
      const id = await newProduct('c', 100, 5);
      await addToCart('bob', id, 4).expect(201);
      await prisma.product.update({ where: { id }, data: { stock: 2 } });
      const res = await place('bob').expect(409);
      expect(res.body).toMatchObject({
        code: 'NOT_ENOUGH_STOCK',
        productId: id,
      });
      expect(await stockOf(id)).toBe(2);
      const cart = await http().get('/cart').set(as('bob')).expect(200);
      expect(cart.body.items).toHaveLength(1);
      expect(await prisma.order.count({ where: { userId: userId.bob } })).toBe(
        0,
      );
      await http().delete('/cart').set(as('bob')).expect(204);
    });

    it('refuses an order that includes a removed product, and takes no stock from the others', async () => {
      const gone = await newProduct('d', 100, 5);
      await addToCart('bob', products.b, 1).expect(201);
      await addToCart('bob', gone, 1).expect(201);
      const before = await stockOf(products.b);
      await prisma.product.update({
        where: { id: gone },
        data: { active: false },
      });
      expect((await place('bob').expect(409)).body).toMatchObject({
        code: 'UNAVAILABLE',
      });
      expect(await stockOf(products.b)).toBe(before);
      await http().delete('/cart').set(as('bob')).expect(204);
    });

    it('sells the last units to one customer only, when two order at the same moment', async () => {
      const id = await newProduct('last', 100, 3);
      await addToCart('bob', id, 2).expect(201);
      await addToCart('cy', id, 2).expect(201);
      const results = await Promise.all([place('bob'), place('cy')]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await stockOf(id)).toBe(1);
      const sold = await prisma.orderItem.aggregate({
        where: { productId: id },
        _sum: { quantity: true },
      });
      expect(sold._sum.quantity).toBe(2);
    });

    it('never lets the database go below zero stock', async () => {
      await expect(
        prisma.product.update({
          where: { id: products.b },
          data: { stock: -1 },
        }),
      ).rejects.toThrow();
    });
  });

  describe('idempotency key', () => {
    beforeAll(async () => {
      await newProduct('ka', 1000, 50);
      await newProduct('kb', 250, 50);
      await account('dee');
      await account('eli');
    });

    const key = (n: string) => `key-${tag}-${n}`;
    const ordersOf = (name: string) =>
      prisma.order.count({ where: { userId: userId[name] } });

    it('returns the same order on a retry, without taking the stock twice', async () => {
      await addToCart('dee', products.ka, 2).expect(201);
      const stockBefore = await stockOf(products.ka);
      const first = await place('dee', key('retry')).expect(201);
      const ordersBefore = await ordersOf('dee');
      // The cart is empty now, as after a real checkout whose answer was lost.
      const second = await place('dee', key('retry')).expect(201);
      expect(second.body.id).toBe(first.body.id);
      expect(await ordersOf('dee')).toBe(ordersBefore);
      expect(await stockOf(products.ka)).toBe(stockBefore - 2);
    });

    it('creates one order from many parallel requests with the same key', async () => {
      await addToCart('eli', products.kb, 3).expect(201);
      const stockBefore = await stockOf(products.kb);
      const ordersBefore = await ordersOf('eli');
      const results = await Promise.all(
        Array.from({ length: 8 }, () => place('eli', key('parallel'))),
      );
      expect(results.map((r) => r.status)).toEqual(Array(8).fill(201));
      expect(new Set(results.map((r) => r.body.id as string)).size).toBe(1);
      expect(await ordersOf('eli')).toBe(ordersBefore + 1);
      expect(await stockOf(products.kb)).toBe(stockBefore - 3);
    });

    it('treats a new key as a new order and keeps keys apart per user', async () => {
      await addToCart('dee', products.kb, 1).expect(201);
      const mine = await place('dee', key('shared')).expect(201);
      await addToCart('eli', products.kb, 1).expect(201);
      const theirs = await place('eli', key('shared')).expect(201);
      expect(theirs.body.id).not.toBe(mine.body.id);
      await addToCart('dee', products.kb, 1).expect(201);
      const next = await place('dee', key('other')).expect(201);
      expect(next.body.id).not.toBe(mine.body.id);
    });

    it('still answers 409 for an empty cart when the key is new', async () => {
      const res = await place('dee', key('empty')).expect(409);
      expect(res.body).toMatchObject({ code: 'EMPTY_CART' });
    });
  });

  it('keeps an order when its owner is removed only if the database allows it: it does not', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: `ana-${tag}@example.com` },
    });
    await expect(
      prisma.user.delete({ where: { id: user.id } }),
    ).rejects.toThrow();
  });
});
