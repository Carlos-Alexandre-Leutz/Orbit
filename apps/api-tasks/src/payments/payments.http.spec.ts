import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FakePaymentProvider, signFakeEvent } from './fake-payment.provider';
import { PaymentProvider } from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('payments webhook HTTP', () => {
  let app: INestApplication;
  const prisma = {
    processedPaymentEvent: { createMany: jest.fn() },
    order: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const body = JSON.stringify({
    id: 'evt_1',
    type: 'payment.succeeded',
    orderId: 'o1',
    reference: 'ref1',
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        { provide: PaymentProvider, useValue: new FakePaymentProvider() },
      ],
    })
      .useMocker(() => prisma) // PrismaService
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
    prisma.processedPaymentEvent.createMany.mockResolvedValue({ count: 1 });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
  });

  const post = (signature?: string) => {
    const req = request(app.getHttpServer())
      .post('/payments/webhook')
      .set('Content-Type', 'application/json');
    if (signature) {
      req.set('stripe-signature', signature);
    }
    return req.send(body);
  };

  it('needs no session but a valid signature on the raw body', async () => {
    await post(signFakeEvent(body)).expect(200, { received: true });
    expect(prisma.order.updateMany).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'bad'])(
    'refuses the signature %p with 400',
    async (s) => {
      await post(s).expect(400);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    },
  );

  it('does nothing for an event it already recorded', async () => {
    prisma.processedPaymentEvent.createMany.mockResolvedValue({ count: 0 });
    await post(signFakeEvent(body)).expect(200);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });
});
