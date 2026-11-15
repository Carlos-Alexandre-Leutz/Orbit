import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../payments/payments.service';
import { StoresService } from '../stores/stores.service';

const ID = '6f1c1f0e-8a39-4a27-a2c1-1d6d8c7b0001';

describe('orders HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const orders = {
    createFromCart: jest.fn().mockResolvedValue({ id: ID }),
    listMine: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ id: ID }),
    transition: jest.fn().mockResolvedValue({ id: ID }),
    cancel: jest.fn().mockResolvedValue({ id: ID }),
  };
  const stores = {
    bySlug: jest.fn().mockResolvedValue({ id: 'store-1' }),
    ofSeller: jest.fn().mockResolvedValue({ id: 'store-7' }),
  };
  const payments = { pay: jest.fn().mockResolvedValue({ id: ID }) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ global: true, secret: 'a-test-secret' })],
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: orders },
        { provide: PaymentsService, useValue: payments },
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

  const as = (role: Role, sub = 'user-1') => ({
    Authorization: `Bearer ${jwt.sign({ sub, role })}`,
  });
  const server = () => request(app.getHttpServer());

  it.each([
    ['post', '/orders'],
    ['get', '/orders'],
    ['get', `/orders/${ID}`],
    ['post', `/orders/${ID}/pay`],
    ['post', `/orders/${ID}/cancel`],
    ['post', `/orders/${ID}/ship`],
    ['post', `/orders/${ID}/deliver`],
  ] as const)('%s %s needs a session', async (method, path) => {
    await server()[method](path).expect(401);
  });

  it('places an order for the user of the token and reads it back through the same user', async () => {
    await server()
      .post('/orders?store=loja-x')
      .set(as('CUSTOMER', 'user-9'))
      .expect(201);
    expect(stores.bySlug).toHaveBeenCalledWith('loja-x');
    expect(orders.createFromCart).toHaveBeenCalledWith(
      'user-9',
      'store-1',
      undefined,
    );
    await server()
      .get(`/orders/${ID}`)
      .set(as('CUSTOMER', 'user-9'))
      .expect(200);
    expect(orders.get).toHaveBeenCalledWith(ID, {
      id: 'user-9',
      role: 'CUSTOMER',
    });
  });

  it('needs the store link, and only a customer buys', async () => {
    await server().post('/orders').set(as('CUSTOMER')).expect(400);
    for (const role of ['SELLER', 'ADMIN'] as const) {
      await server().post('/orders?store=loja-x').set(as(role)).expect(403);
    }
    expect(orders.createFromCart).not.toHaveBeenCalled();
  });

  it('lists my orders, all or only those of one store', async () => {
    await server().get('/orders').set(as('CUSTOMER', 'user-9')).expect(200);
    expect(orders.listMine).toHaveBeenLastCalledWith('user-9', undefined);
    await server()
      .get('/orders?store=loja-x')
      .set(as('CUSTOMER', 'user-9'))
      .expect(200);
    expect(orders.listMine).toHaveBeenLastCalledWith('user-9', 'store-1');
  });

  it('passes the idempotency key to the service and refuses a malformed one', async () => {
    await server()
      .post('/orders?store=loja-x')
      .set(as('CUSTOMER', 'user-9'))
      .set('Idempotency-Key', 'checkout-1234abcd')
      .expect(201);
    expect(orders.createFromCart).toHaveBeenCalledWith(
      'user-9',
      'store-1',
      'checkout-1234abcd',
    );
    for (const bad of ['short', 'has space in it', 'x'.repeat(129)]) {
      await server()
        .post('/orders?store=loja-x')
        .set(as('CUSTOMER'))
        .set('Idempotency-Key', bad)
        .expect(400);
    }
    expect(orders.createFromCart).toHaveBeenCalledTimes(1);
  });

  it('pays an order of the user of the token, with the chosen test card', async () => {
    await server()
      .post(`/orders/${ID}/pay`)
      .set(as('CUSTOMER', 'user-9'))
      .send({ paymentMethod: 'pm_card_chargeDeclined' })
      .expect(201);
    expect(payments.pay).toHaveBeenCalledWith(
      ID,
      'user-9',
      'pm_card_chargeDeclined',
    );
  });

  it('cancels for the user of the token, whatever the role, and the service decides', async () => {
    await server()
      .post(`/orders/${ID}/cancel`)
      .set(as('SELLER', 'seller-1'))
      .expect(201);
    expect(orders.cancel).toHaveBeenCalledWith(ID, {
      id: 'seller-1',
      role: 'SELLER',
      storeId: 'store-7',
    });
  });

  it('refuses a payment method that is not a test id', async () => {
    await server()
      .post(`/orders/${ID}/pay`)
      .set(as('CUSTOMER'))
      .send({ paymentMethod: '4242 4242 4242 4242' })
      .expect(400);
    expect(payments.pay).not.toHaveBeenCalled();
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
      expect(orders.transition).toHaveBeenCalledWith(
        ID,
        state,
        role === 'SELLER'
          ? { id: 'user-1', role, storeId: 'store-7' }
          : { id: 'user-1', role },
      );
    });
  });
});
