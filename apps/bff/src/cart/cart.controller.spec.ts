import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { of } from 'rxjs';
import { CartController } from './cart.controller';

describe('BFF CartController', () => {
  const http = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  let controller: CartController;

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const verb of ['get', 'post', 'patch', 'delete'] as const) {
      http[verb].mockReturnValue(of({ data: { items: [] } }));
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: HttpService, useValue: http }],
    }).compile();
    controller = moduleRef.get(CartController);
  });

  it('forwards the session of the caller on every call', async () => {
    await controller.view('Bearer t');
    await controller.add({ productId: 'p', quantity: 1 }, 'Bearer t');
    await controller.setQuantity('p', { quantity: 2 }, 'Bearer t');
    await controller.removeLine('p', 'Bearer t');
    await controller.clear('Bearer t');
    const headers = [
      http.get.mock.calls[0][1],
      http.post.mock.calls[0][2],
      http.patch.mock.calls[0][2],
      http.delete.mock.calls[0][1],
      http.delete.mock.calls[1][1],
    ].map((c) => c.headers);
    expect(headers).toEqual(Array(5).fill({ Authorization: 'Bearer t' }));
  });

  it('is in the OpenAPI document and every operation needs a bearer token', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: HttpService, useValue: http }],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    await app.close();
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/cart',
        '/cart/items',
        '/cart/items/{productId}',
      ]),
    );
    expect(doc.paths['/cart'].get?.security).toEqual([{ bearer: [] }]);
    expect(doc.paths['/cart/items'].post?.security).toEqual([{ bearer: [] }]);
  });
});
