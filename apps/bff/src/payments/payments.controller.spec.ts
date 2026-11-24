import { BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { of } from 'rxjs';
import { PaymentsController } from './payments.controller';

describe('BFF PaymentsController', () => {
  const http = { post: jest.fn() };
  let controller: PaymentsController;

  beforeEach(async () => {
    jest.resetAllMocks();
    http.post.mockReturnValue(of({ data: { received: true } }));
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: HttpService, useValue: http }],
    }).compile();
    controller = moduleRef.get(PaymentsController);
  });

  it('forwards the raw body and the signature, byte for byte', async () => {
    const rawBody = Buffer.from('{"id":"evt_1" ,"spaces":  "kept"}');
    await controller.webhook({ rawBody } as never, 'sig-1');
    const [url, body, config] = http.post.mock.calls[0] as [
      string,
      Buffer,
      { headers: Record<string, string> },
    ];
    expect(url).toMatch(/\/payments\/webhook$/);
    expect(body).toBe(rawBody);
    expect(config.headers).toEqual({
      'Content-Type': 'application/json',
      'stripe-signature': 'sig-1',
    });
  });

  it('sends no signature header when there is none', async () => {
    await controller.webhook({ rawBody: Buffer.from('{}') } as never);
    const config = (http.post.mock.calls[0] as unknown[])[2] as {
      headers: Record<string, string>;
    };
    expect(config.headers).not.toHaveProperty('stripe-signature');
  });

  it('refuses a request without a body', () => {
    expect(() => controller.webhook({} as never, 'sig')).toThrow(
      BadRequestException,
    );
  });

  it('receives the raw bytes through Fastify, whatever their spacing', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: HttpService, useValue: http }],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { rawBody: true },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const payload = '{ "id" :"evt_1",\n  "x":  1 }';
    const res = await app.inject({
      method: 'POST',
      url: '/payments/webhook',
      headers: { 'content-type': 'application/json', 'stripe-signature': 's' },
      payload,
    });
    expect(res.statusCode).toBe(200);
    expect((http.post.mock.calls[0] as [string, Buffer])[1].toString()).toBe(
      payload,
    );
    await app.close();
  });
});
