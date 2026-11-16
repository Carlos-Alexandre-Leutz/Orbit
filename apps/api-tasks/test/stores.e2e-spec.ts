import { randomBytes } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Runs the real application against a real PostgreSQL (DATABASE_URL), after `prisma migrate deploy`.
 * Everything it creates carries a random tag and is removed at the end, so it can share a database.
 */
describe('stores (real database)', () => {
  const tag = randomBytes(4).toString('hex');
  const email = (n: string) => `${n}-${tag}@example.com`;
  const slug = (n: string) => `t${tag}-${n}`;
  const password = 'a-good-password';
  const prisma = new PrismaClient();
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

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
  });

  afterAll(async () => {
    const where = { email: { endsWith: `-${tag}@example.com` } };
    await prisma.store.deleteMany({ where: { owner: where } });
    await prisma.user.deleteMany({ where });
    await prisma.$disconnect();
    await app.close();
  });

  const signUpSeller = (n: string, extra: Record<string, unknown> = {}) =>
    http()
      .post('/auth/register')
      .send({
        email: email(n),
        password,
        accountType: 'SELLER',
        storeName: `Store ${n}`,
        storeSlug: slug(n),
        ...extra,
      });

  it('creates the seller and the store together', async () => {
    const res = await signUpSeller('joao').expect(201);
    expect(res.body.user.role).toBe('SELLER');
    expect(res.body.store.slug).toBe(slug('joao'));
    const store = await prisma.store.findUnique({
      where: { slug: slug('joao') },
    });
    expect(store?.ownerId).toBe(res.body.user.id);
  });

  it('refuses a link that is already taken and keeps no half-made seller', async () => {
    await signUpSeller('maria').expect(201);
    await signUpSeller('ana', { storeSlug: slug('maria') }).expect(409);
    expect(
      await prisma.user.findUnique({ where: { email: email('ana') } }),
    ).toBeNull();
  });

  it('refuses a reserved link and a missing store name', async () => {
    await signUpSeller('pedro', { storeSlug: 'panel' }).expect(400);
    await signUpSeller('pedro', { storeName: '' }).expect(400);
    expect(
      await prisma.user.findUnique({ where: { email: email('pedro') } }),
    ).toBeNull();
  });

  it('never gives a role or a store to a plain customer sign-up', async () => {
    const res = await http()
      .post('/auth/register')
      .send({
        email: email('cli'),
        password,
        role: 'ADMIN',
        storeName: 'Sneaky',
      })
      .expect(201);
    expect(res.body.user.role).toBe('CUSTOMER');
    expect(res.body.store).toBeUndefined();
  });

  it('shows a store and the store list to anyone, without the owner', async () => {
    await signUpSeller('lia').expect(201);
    const one = await http()
      .get(`/stores/${slug('lia')}`)
      .expect(200);
    expect(one.body).toEqual({
      slug: slug('lia'),
      name: 'Store lia',
      description: '',
      tagline: '',
      primaryColor: '#2563eb',
      logoImageId: null,
      coverImageId: null,
      contactEmail: '',
      contactPhone: '',
    });
    const list = await http().get('/stores').expect(200);
    expect(
      (list.body as { slug: string }[]).some((s) => s.slug === slug('lia')),
    ).toBe(true);
    expect(JSON.stringify(list.body)).not.toContain('ownerId');
    await http().get('/stores/nowhere-at-all').expect(404);
  });
});
