import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const ID = '6f1c1f0e-8a39-4a27-a2c1-1d6d8c7b0001';

describe('orders HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const orders = {
    createFromCart: jest.fn().mockResolvedValue({ id: ID }),
    listMine: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ id: ID }),
    transition: jest.fn().mockResolvedValue({ id: ID }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ global: true, secret: 'a-test-secret' })],
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: orders }],
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

  const as = (role: Role, sub = 'user-1') => ({
    Authorization: `Bearer ${jwt.sign({ sub, role })}`,
  });
  const server = () => request(app.getHttpServer());

  it.each([
    ['post', '/orders'],
    ['get', '/orders'],
    ['get', `/orders/${ID}`],
    ['post', `/orders/${ID}/ship`],
    ['post', `/orders/${ID}/deliver`],
  ] as const)('%s %s needs a session', async (method, path) => {
    await server()[method](path).expect(401);
  });

  it('places an order for the user of the token and reads it back through the same user', async () => {
    await server().post('/orders').set(as('CUSTOMER', 'user-9')).expect(201);
    expect(orders.createFromCart).toHaveBeenCalledWith('user-9');
    await server()
      .get(`/orders/${ID}`)
      .set(as('CUSTOMER', 'user-9'))
      .expect(200);
    expect(orders.get).toHaveBeenCalledWith(ID, {
      id: 'user-9',
      role: 'CUSTOMER',
    });
  });

  it('refuses a malformed order id', async () => {
    await server().get('/orders/not-a-uuid').set(as('CUSTOMER')).expect(400);
  });

  describe('shipping and delivering', () => {
    it.each(['ship', 'deliver'])(
      '%s: a customer is refused',
      async (action) => {
        await server()
          .post(`/orders/${ID}/${action}`)
          .set(as('CUSTOMER'))
          .expect(403);
        expect(orders.transition).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['SELLER', 'ship', 'SHIPPED'],
      ['ADMIN', 'ship', 'SHIPPED'],
      ['SELLER', 'deliver', 'DELIVERED'],
      ['ADMIN', 'deliver', 'DELIVERED'],
    ] as const)('%s can %s', async (role, action, state) => {
      await server().post(`/orders/${ID}/${action}`).set(as(role)).expect(201);
      expect(orders.transition).toHaveBeenCalledWith(ID, state);
    });
  });
});
