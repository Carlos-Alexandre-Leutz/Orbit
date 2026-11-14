import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { CatalogController } from './catalog.controller';

describe('BFF CatalogController', () => {
  const http = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  let controller: CatalogController;

  beforeEach(async () => {
    jest.resetAllMocks();
    http.get.mockReturnValue(of({ data: { items: [] } }));
    http.post.mockReturnValue(of({ data: { id: 'p1' } }));
    http.delete.mockReturnValue(of({ data: '' }));
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [{ provide: HttpService, useValue: http }],
    }).compile();
    controller = moduleRef.get(CatalogController);
  });

  it('passes the query string of the listing to the store API', async () => {
    await controller.list({ q: 'skillet', pageSize: '5' });
    expect(http.get.mock.calls[0][1].params).toEqual({
      q: 'skillet',
      pageSize: '5',
    });
  });

  it('reads the catalog without a session', async () => {
    await controller.categories();
    expect(http.get.mock.calls[0][1].headers).toEqual({});
  });

  it('forwards the session on writes', async () => {
    await controller.create(
      { sku: 'A-100', name: 'x', priceCents: 1, stock: 1, categorySlug: 'a' },
      'Bearer t',
    );
    expect(http.post.mock.calls[0][2].headers).toEqual({
      Authorization: 'Bearer t',
    });
    await controller.remove('id-1', 'Bearer t');
    expect(http.delete.mock.calls[0][1].headers).toEqual({
      Authorization: 'Bearer t',
    });
  });

  it('is described in the OpenAPI document with its bearer-protected writes', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
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
      expect.arrayContaining(['/products', '/products/{id}', '/categories']),
    );
    const params = (doc.paths['/products'].get?.parameters ?? []).map((p) =>
      'name' in p ? p.name : '',
    );
    expect(params).toEqual(
      expect.arrayContaining(['q', 'category', 'inStock', 'sort']),
    );
    expect(doc.paths['/products'].post?.security).toEqual([{ bearer: [] }]);
    expect(doc.paths['/products'].get?.security).toBeUndefined();
  });
});
