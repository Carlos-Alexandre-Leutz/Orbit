import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { of } from 'rxjs';
import { OrdersController } from './orders.controller';

describe('BFF OrdersController', () => {
  const http = { get: jest.fn(), post: jest.fn() };
  const build = async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: HttpService, useValue: http }],
    }).compile();
    return moduleRef;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    http.get.mockReturnValue(of({ data: [] }));
    http.post.mockReturnValue(of({ data: { id: 'o1' } }));
  });

  it('forwards the session of the caller on every call', async () => {
    const controller = (await build()).get(OrdersController);
    await controller.place('Bearer t');
    await controller.mine('Bearer t');
    await controller.one('o1', 'Bearer t');
    await controller.pay('o1', {}, 'Bearer t');
    await controller.ship('o1', 'Bearer t');
    await controller.deliver('o1', 'Bearer t');
    const calls = [...http.post.mock.calls, ...http.get.mock.calls];
    expect(calls).toHaveLength(6);
    for (const call of calls) {
      const config = call[call.length - 1] as { headers: object };
      expect(config.headers).toEqual({ Authorization: 'Bearer t' });
    }
  });

  it('is in the OpenAPI document, protected by a bearer token', async () => {
    const app = (await build()).createNestApplication();
    await app.init();
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    await app.close();
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/orders',
        '/orders/{id}',
        '/orders/{id}/ship',
        '/orders/{id}/deliver',
      ]),
    );
    expect(doc.paths['/orders'].post?.security).toEqual([{ bearer: [] }]);
  });
});
