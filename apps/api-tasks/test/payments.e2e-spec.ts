import { randomBytes } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { signFakeEvent } from '../src/payments/fake-payment.provider';

interface OrderBody {
  id: string;
  status: string;
  paidAt: string | null;
}

/** Paying on a real PostgreSQL, with the fake provider. Everything it creates carries a random tag. */
describe('payments (real database)', () => {
  const tag = randomBytes(4).toString('hex');
  const prisma = new PrismaClient();
  let app: INestApplication;
  let productId: string;
  let categoryId: string;
  const http = () => request(app.getHttpServer());
  const bearer: Record<string, string> = {};
  let eventCount = 0;

  async function account(name: string, role: Role = 'CUSTOMER') {
    const email = `${name}-${tag}@example.com`;
    const password = 'a-good-password';
    const reg = await http()
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
    let token = reg.body.accessToken as string;
    if (role !== 'CUSTOMER') {
      await prisma.user.update({ where: { email }, data: { role } });
      const login = await http()
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      token = login.body.accessToken as string;
    }
    bearer[name] = `Bearer ${token}`;
  }
  const as = (name: string) => ({ Authorization: bearer[name] });
  async function newOrder(name: string) {
    await http()
      .post('/cart/items')
      .set(as(name))
      .send({ productId, quantity: 1 })
      .expect(201);
    return (await http().post('/orders').set(as(name)).expect(201))
      .body as OrderBody;
  }
  const pay = (name: string, id: string, paymentMethod?: string) =>
    http().post(`/orders/${id}/pay`).set(as(name)).send({ paymentMethod });
  const rowOf = (id: string) =>
    prisma.order.findUniqueOrThrow({ where: { id } });
  const cancel = (name: string, id: string) =>
    http().post(`/orders/${id}/cancel`).set(as(name));
  const stockOf = async () =>
    (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
      .stock;
  const eventId = () => `evt-${tag}-${++eventCount}`;
  const webhook = (event: object, signature?: string) => {
    const body = JSON.stringify(event);
    return http()
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature ?? signFakeEvent(body))
      .send(body);
  };
  const succeeded = (id: string, orderId: string, reference: string) => ({
    id,
    type: 'payment.succeeded',
    orderId,
    reference,
  });

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'an-integration-test-secret-1234567890';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    // Listening once keeps the parallel requests below from each opening the server on their own port.
    await app.listen(0);
    categoryId = (
      await prisma.category.create({
        data: { slug: `p${tag}`, name: 'Payment tests' },
      })
    ).id;
    productId = (
      await prisma.product.create({
        data: {
          sku: `P${tag.toUpperCase()}-A`,
          name: 'Payment item',
          priceCents: 700,
          stock: 100,
          categoryId,
        },
      })
    ).id;
    await account('ana');
    await account('bob');
    await account('sam', 'SELLER');
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: `-${tag}@example.com` } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.order.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.processedPaymentEvent.deleteMany({
      where: { id: { startsWith: `evt-${tag}-` } },
    });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('pays an order: it becomes PAID with a payment reference', async () => {
    const order = await newOrder('ana');
    const res = await pay('ana', order.id).expect(201);
    expect(res.body.status).toBe('PAID');
    expect(res.body.paidAt).toBeTruthy();
    expect((await rowOf(order.id)).paymentRef).toMatch(/^fake_pi_/);
  });

  it('paying twice returns the paid order and keeps the first payment', async () => {
    const order = await newOrder('ana');
    await pay('ana', order.id).expect(201);
    const first = await rowOf(order.id);
    const again = await pay('ana', order.id).expect(201);
    expect(again.body.status).toBe('PAID');
    expect((await rowOf(order.id)).paymentRef).toBe(first.paymentRef);
  });

  it('pays once when the same payment arrives in parallel', async () => {
    const order = await newOrder('ana');
    const results = await Promise.all(
      Array.from({ length: 8 }, () => pay('ana', order.id)),
    );
    expect(results.map((r) => r.status)).toEqual(Array(8).fill(201));
    expect(results.map((r) => r.body.status)).toEqual(Array(8).fill('PAID'));
    const row = await rowOf(order.id);
    expect(row.status).toBe('PAID');
    expect(row.paymentRef).toMatch(/^fake_pi_/);
  });

  it('leaves the order unpaid and answers 402 for a declined card, then accepts another card', async () => {
    const order = await newOrder('ana');
    const declined = await pay(
      'ana',
      order.id,
      'pm_card_chargeDeclined',
    ).expect(402);
    expect(declined.body.code).toBe('PAYMENT_DECLINED');
    expect((await rowOf(order.id)).status).toBe('PENDING_PAYMENT');
    await pay('ana', order.id, 'pm_card_visa').expect(201);
    expect((await rowOf(order.id)).status).toBe('PAID');
  });

  it("does not let another user see or pay someone's order", async () => {
    const order = await newOrder('ana');
    await pay('bob', order.id).expect(404);
    expect((await rowOf(order.id)).status).toBe('PENDING_PAYMENT');
  });

  describe('webhook', () => {
    it('refuses a missing or wrong signature and changes nothing', async () => {
      const order = await newOrder('ana');
      const event = succeeded(eventId(), order.id, 'ref-x');
      await webhook(event, 'wrong').expect(400);
      expect((await rowOf(order.id)).status).toBe('PENDING_PAYMENT');
      await http()
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(event))
        .expect(400);
    });

    it('pays a pending payment confirmed later by the provider', async () => {
      const order = await newOrder('ana');
      const pending = await pay('ana', order.id, 'pm_card_pending').expect(201);
      expect(pending.body.status).toBe('PENDING_PAYMENT');
      await webhook(succeeded(eventId(), order.id, 'ref-late')).expect(200);
      const row = await rowOf(order.id);
      expect(row.status).toBe('PAID');
      expect(row.paymentRef).toBe('ref-late');
    });

    it('applies a repeated event once', async () => {
      const order = await newOrder('ana');
      const event = succeeded(eventId(), order.id, 'ref-1');
      await webhook(event).expect(200);
      const first = await rowOf(order.id);
      await webhook(event).expect(200);
      const second = await rowOf(order.id);
      expect(second.paidAt).toEqual(first.paidAt);
      expect(
        await prisma.processedPaymentEvent.count({ where: { id: event.id } }),
      ).toBe(1);
    });

    it('pays the order once when the call and the webhook confirm it', async () => {
      const order = await newOrder('ana');
      await pay('ana', order.id).expect(201);
      const first = await rowOf(order.id);
      await webhook(succeeded(eventId(), order.id, 'ref-other')).expect(200);
      const after = await rowOf(order.id);
      expect(after.paymentRef).toBe(first.paymentRef);
      expect(after.paidAt).toEqual(first.paidAt);
    });

    it('applies the same event once even when it arrives in parallel', async () => {
      const order = await newOrder('ana');
      const event = succeeded(eventId(), order.id, 'ref-par');
      const results = await Promise.all(
        Array.from({ length: 8 }, () => webhook(event)),
      );
      expect(results.map((r) => r.status)).toEqual(Array(8).fill(200));
      expect(
        await prisma.processedPaymentEvent.count({ where: { id: event.id } }),
      ).toBe(1);
      expect((await rowOf(order.id)).status).toBe('PAID');
    });

    it('ignores a failed-payment event and an event for an unknown order', async () => {
      const order = await newOrder('ana');
      await webhook({
        id: eventId(),
        type: 'payment.failed',
        orderId: order.id,
      }).expect(200);
      expect((await rowOf(order.id)).status).toBe('PENDING_PAYMENT');
      await webhook(
        succeeded(eventId(), '6f1c1f0e-8a39-4a27-a2c1-1d6d8c7b9999', 'ref-z'),
      ).expect(200);
    });
  });

  describe('cancellation', () => {
    it('lets the owner cancel an unpaid order, returns the stock once and ignores a repeat', async () => {
      const before = await stockOf();
      const order = await newOrder('ana');
      expect(await stockOf()).toBe(before - 1);
      const res = await cancel('ana', order.id).expect(201);
      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.cancelledAt).toBeTruthy();
      expect(await stockOf()).toBe(before);
      await cancel('ana', order.id).expect(201);
      expect(await stockOf()).toBe(before);
    });

    it('returns the stock once when the same cancellation arrives in parallel', async () => {
      const before = await stockOf();
      const order = await newOrder('ana');
      const results = await Promise.all(
        Array.from({ length: 8 }, () => cancel('ana', order.id)),
      );
      for (const r of results) {
        expect([201, 409]).toContain(r.status);
      }
      expect(results.some((r) => r.status === 201)).toBe(true);
      expect((await rowOf(order.id)).status).toBe('CANCELLED');
      expect(await stockOf()).toBe(before);
    });

    it('does not let a customer cancel a paid order, but lets a seller, who refunds it', async () => {
      const before = await stockOf();
      const order = await newOrder('ana');
      await pay('ana', order.id).expect(201);
      const refused = await cancel('ana', order.id).expect(403);
      expect(refused.body.code).toBe('CANCEL_NEEDS_STAFF');
      expect((await rowOf(order.id)).status).toBe('PAID');
      expect(await stockOf()).toBe(before - 1);

      const res = await cancel('sam', order.id).expect(201);
      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.refunded).toBe(true);
      const row = await rowOf(order.id);
      expect(row.refundRef).toMatch(/^fake_re_/);
      expect(await stockOf()).toBe(before);
      await cancel('sam', order.id).expect(201);
      expect((await rowOf(order.id)).refundRef).toBe(row.refundRef);
      expect(await stockOf()).toBe(before);
    });

    it('refuses to cancel a shipped order and keeps the stock taken', async () => {
      const order = await newOrder('ana');
      await pay('ana', order.id).expect(201);
      await http().post(`/orders/${order.id}/ship`).set(as('sam')).expect(201);
      const before = await stockOf();
      for (const who of ['ana', 'sam']) {
        const res = await cancel(who, order.id).expect(409);
        expect(res.body.code).toBe('INVALID_TRANSITION');
      }
      expect((await rowOf(order.id)).status).toBe('SHIPPED');
      expect(await stockOf()).toBe(before);
    });

    it("does not let another customer cancel someone else's order", async () => {
      const order = await newOrder('ana');
      await cancel('bob', order.id).expect(404);
      expect((await rowOf(order.id)).status).toBe('PENDING_PAYMENT');
    });

    it('settles a cancellation racing with shipping in exactly one way', async () => {
      const before = await stockOf();
      const order = await newOrder('ana');
      await pay('ana', order.id).expect(201);
      const [shipped, cancelled] = await Promise.all([
        http().post(`/orders/${order.id}/ship`).set(as('sam')),
        cancel('sam', order.id),
      ]);
      const row = await rowOf(order.id);
      if (row.status === 'SHIPPED') {
        expect([shipped.status, cancelled.status]).toEqual([201, 409]);
        expect(row.refundRef).toBeNull();
        expect(await stockOf()).toBe(before - 1);
      } else {
        expect(row.status).toBe('CANCELLED');
        expect([shipped.status, cancelled.status]).toEqual([409, 201]);
        expect(row.refundRef).toMatch(/^fake_re_/);
        expect(await stockOf()).toBe(before);
      }
    });

    it('refunds a payment that the provider confirms after the order was cancelled', async () => {
      const order = await newOrder('ana');
      await pay('ana', order.id, 'pm_card_pending').expect(201);
      await cancel('ana', order.id).expect(201);
      await webhook(succeeded(eventId(), order.id, 'ref-after-cancel')).expect(
        200,
      );
      const row = await rowOf(order.id);
      expect(row.status).toBe('CANCELLED');
      expect(row.paymentRef).toBe('ref-after-cancel');
      expect(row.refundRef).toMatch(/^fake_re_/);
    });
  });
});
