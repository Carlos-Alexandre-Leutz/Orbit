import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesController } from './categories.controller';
import { ProductsController } from './products.controller';
import { StoresService } from '../stores/stores.service';
import { ProductsService } from './products.service';

const SECRET = 'a-test-secret-that-is-long-enough-1234';
const ID = '6f1c1f0e-8a39-4a27-a2c1-1d6d8c7b0001';
const valid = {
  sku: 'KIT-900',
  name: 'Wooden spoon',
  priceCents: 490,
  stock: 12,
  categorySlug: 'kitchen',
};

describe('catalog HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const products = {
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    get: jest.fn().mockResolvedValue({ id: ID }),
    create: jest.fn().mockResolvedValue({ id: ID }),
    update: jest.fn().mockResolvedValue({ id: ID }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const stores = {
    ofSeller: jest.fn().mockResolvedValue({ id: 'store-1' }),
  };
  // The guard reads the role from the database; here it is the role the test signed the token with.
  const roles = new Map<string, Role>();
  const prisma = {
    user: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(
          roles.has(where.id)
            ? { id: where.id, role: roles.get(where.id) }
            : null,
        ),
    },
    category: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ slug: 'a', name: 'A' }),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ global: true, secret: SECRET })],
      controllers: [ProductsController, CategoriesController],
      providers: [
        { provide: ProductsService, useValue: products },
        { provide: StoresService, useValue: stores },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  const as = (role: Role) => {
    roles.set('u1', role);
    return `Bearer ${jwt.sign({ sub: 'u1', role })}`;
  };
  const server = () => request(app.getHttpServer());

  describe('reading is public', () => {
    it('lists products and categories without a session', async () => {
      await server().get('/products').expect(200);
      await server().get('/categories').expect(200);
    });

    it('reads one product by id and refuses a malformed id', async () => {
      await server().get(`/products/${ID}`).expect(200);
      await server().get('/products/not-a-uuid').expect(400);
    });

    it('accepts the search, filter and sort parameters', async () => {
      await server()
        .get(
          '/products?q=skillet&store=loja-x&category=kitchen&inStock=true&sort=price_asc',
        )
        .expect(200);
      expect(products.list).toHaveBeenCalledWith({
        q: 'skillet',
        store: 'loja-x',
        category: 'kitchen',
        inStock: true,
        sort: 'price_asc',
      });
    });

    it('refuses an unknown sort, a long search and a non-boolean stock filter', async () => {
      await server().get('/products?sort=cheapest').expect(400);
      await server()
        .get(`/products?q=${'a'.repeat(101)}`)
        .expect(400);
      await server().get('/products?inStock=maybe').expect(400);
    });

    it('caps the page size and refuses a bad page', async () => {
      await server().get('/products?pageSize=101').expect(400);
      await server().get('/products?page=0').expect(400);
      await server().get('/products?pageSize=100&page=2').expect(200);
      expect(products.list).toHaveBeenCalledWith({ pageSize: 100, page: 2 });
    });
  });

  describe('writing needs a seller', () => {
    const writes: Array<[string, () => request.Test]> = [
      ['create', () => server().post('/products').send(valid)],
      ['update', () => server().patch(`/products/${ID}`).send({ stock: 1 })],
      ['remove', () => server().delete(`/products/${ID}`)],
      [
        'create category',
        () => server().post('/categories').send({ slug: 'a', name: 'A' }),
      ],
    ];

    it.each(writes)('%s without a session is 401', async (_name, call) => {
      await call().expect(401);
    });

    it.each(writes)('%s as a customer is 403', async (_name, call) => {
      await call().set('Authorization', as('CUSTOMER')).expect(403);
    });

    it('a seller writes in the store found from the session, never one from the body', async () => {
      await server()
        .post('/products')
        .set('Authorization', as('SELLER'))
        .send({ ...valid, storeId: 'someone-elses-store' })
        .expect(201);
      expect(stores.ofSeller).toHaveBeenCalledWith('u1');
      expect(products.create).toHaveBeenCalledWith('store-1', valid);
      await server()
        .delete(`/products/${ID}`)
        .set('Authorization', as('SELLER'))
        .expect(204);
      expect(products.remove).toHaveBeenCalledWith('store-1', ID);
    });

    it('an admin has no store and cannot write products', async () => {
      await server()
        .post('/products')
        .set('Authorization', as('ADMIN'))
        .send(valid)
        .expect(403);
      expect(products.create).not.toHaveBeenCalled();
    });
  });

  describe('input is validated', () => {
    const post = (body: object) =>
      server().post('/products').set('Authorization', as('SELLER')).send(body);

    it.each([
      ['a negative price', { priceCents: -1 }],
      ['a fractional price', { priceCents: 9.5 }],
      ['a negative stock', { stock: -3 }],
      ['a stock above the limit', { stock: 1_000_001 }],
      ['a lowercase sku', { sku: 'kit-900' }],
      ['a too short sku', { sku: 'A1' }],
      ['an empty name', { name: '' }],
      ['a missing category', { categorySlug: undefined }],
    ])('refuses %s', async (_label, patch) => {
      await post({ ...valid, ...patch }).expect(400);
      expect(products.create).not.toHaveBeenCalled();
    });

    it('does not let an update change the sku', async () => {
      await server()
        .patch(`/products/${ID}`)
        .set('Authorization', as('SELLER'))
        .send({ sku: 'NEW-1', stock: 4 })
        .expect(200);
      expect(products.update).toHaveBeenCalledWith('store-1', ID, { stock: 4 });
    });

    it('refuses a category slug with capitals', async () => {
      await server()
        .post('/categories')
        .set('Authorization', as('SELLER'))
        .send({ slug: 'Bad Slug', name: 'x' })
        .expect(400);
    });
  });
});
