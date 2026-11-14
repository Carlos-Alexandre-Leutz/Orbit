import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CartController } from './cart.controller';
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ global: true, secret: 'a-test-secret' })],
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: cart }],
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

  const auth = (sub = 'user-1') => ({
    Authorization: `Bearer ${jwt.sign({ sub, role: 'CUSTOMER' })}`,
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
      .post('/cart/items')
      .set(auth('user-7'))
      .send({ productId: ID, quantity: 2, userId: 'someone-else' })
      .expect(201);
    expect(cart.add).toHaveBeenCalledWith('user-7', ID, 2);
    await server()
      .get('/cart')
      .set(auth('user-7'))
      .query({ userId: 'x' })
      .expect(200);
    expect(cart.view).toHaveBeenCalledWith('user-7');
  });

  it.each([
    ['a zero quantity', { productId: ID, quantity: 0 }],
    ['a negative quantity', { productId: ID, quantity: -1 }],
    ['a fractional quantity', { productId: ID, quantity: 1.5 }],
    ['a text quantity', { productId: ID, quantity: 'two' }],
    ['a malformed product id', { productId: 'abc', quantity: 1 }],
    ['no product id', { quantity: 1 }],
  ])('refuses %s', async (_label, body) => {
    await server().post('/cart/items').set(auth()).send(body).expect(400);
    expect(cart.add).not.toHaveBeenCalled();
  });

  it('refuses a bad quantity or id when setting a line', async () => {
    await server()
      .patch(`/cart/items/${ID}`)
      .set(auth())
      .send({ quantity: 0 })
      .expect(400);
    await server()
      .patch('/cart/items/not-a-uuid')
      .set(auth())
      .send({ quantity: 1 })
      .expect(400);
  });

  it('answers 204 when removing a line and when emptying the cart', async () => {
    await server().delete(`/cart/items/${ID}`).set(auth()).expect(204);
    await server().delete('/cart').set(auth()).expect(204);
  });
});
