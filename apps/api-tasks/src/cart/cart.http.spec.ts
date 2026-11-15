import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CartController } from './cart.controller';
import { StoresService } from '../stores/stores.service';
import { CartService } from './cart.service';

const ID = '6f1c1f0e-8a39-4a27-a2c1-1d6d8c7b0001';

describe('cart HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const cart = {
    view: jest.fn().mockResolvedValue({ items: [] }),
    add: jest.fn().mockResolvedValue({ items: [] }),
    setQuantity: jest.fn().mockResolvedValue({ items: [] }),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  const stores = {
    bySlug: jest.fn().mockResolvedValue({ id: 'store-1' }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ global: true, secret: 'a-test-secret' })],
      controllers: [CartController],
      providers: [
        { provide: CartService, useValue: cart },
        { provide: StoresService, useValue: stores },
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

  const auth = (sub = 'user-1', role = 'CUSTOMER') => ({
    Authorization: `Bearer ${jwt.sign({ sub, role })}`,
  });
  const server = () => request(app.getHttpServer());

  it.each([
    ['get', '/cart'],
    ['post', '/cart/items'],
    ['patch', `/cart/items/${ID}`],
    ['delete', `/cart/items/${ID}`],
    ['delete', '/cart'],
  ] as const)('%s %s needs a session', async (method, path) => {
    await server()[method](path).expect(401);
  });

  it('uses the user of the token, never one named in the request', async () => {
    await server()
      .post('/cart/items?store=loja-x')
      .set(auth('user-7'))
      .send({ productId: ID, quantity: 2, userId: 'someone-else' })
      .expect(201);
    expect(stores.bySlug).toHaveBeenCalledWith('loja-x');
    expect(cart.add).toHaveBeenCalledWith('user-7', 'store-1', ID, 2);
    await server()
      .get('/cart')
      .set(auth('user-7'))
      .query({ userId: 'x', store: 'loja-x' })
      .expect(200);
    expect(cart.view).toHaveBeenCalledWith('user-7', 'store-1');
  });

  it('needs the store link', async () => {
    await server().get('/cart').set(auth()).expect(400);
    await server()
      .post('/cart/items')
      .set(auth())
      .send({ productId: ID, quantity: 1 })
      .expect(400);
    expect(cart.view).not.toHaveBeenCalled();
    expect(cart.add).not.toHaveBeenCalled();
  });

  it.each(['SELLER', 'ADMIN'])('gives a %s no cart', async (role) => {
    await server()
      .get('/cart?store=loja-x')
      .set(auth('user-1', role))
      .expect(403);
    await server()
      .post('/cart/items?store=loja-x')
      .set(auth('user-1', role))
      .send({ productId: ID, quantity: 1 })
      .expect(403);
    expect(cart.add).not.toHaveBeenCalled();
  });

  it.each([
    ['a zero quantity', { productId: ID, quantity: 0 }],
    ['a negative quantity', { productId: ID, quantity: -1 }],
    ['a fractional quantity', { productId: ID, quantity: 1.5 }],
    ['a text quantity', { productId: ID, quantity: 'two' }],
    ['a malformed product id', { productId: 'abc', quantity: 1 }],
    ['no product id', { quantity: 1 }],
  ])('refuses %s', async (_label, body) => {
    await server()
      .post('/cart/items?store=loja-x')
      .set(auth())
      .send(body)
      .expect(400);
    expect(cart.add).not.toHaveBeenCalled();
  });

  it('refuses a bad quantity or id when setting a line', async () => {
    await server()
      .patch(`/cart/items/${ID}?store=loja-x`)
      .set(auth())
      .send({ quantity: 0 })
      .expect(400);
    await server()
      .patch('/cart/items/not-a-uuid?store=loja-x')
      .set(auth())
      .send({ quantity: 1 })
      .expect(400);
  });

  it('answers 204 when removing a line and when emptying the cart', async () => {
    await server()
      .delete(`/cart/items/${ID}?store=loja-x`)
      .set(auth())
      .expect(204);
    await server().delete('/cart?store=loja-x').set(auth()).expect(204);
  });
});
