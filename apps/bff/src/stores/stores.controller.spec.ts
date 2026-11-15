import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { StoresController } from './stores.controller';

describe('BFF StoresController', () => {
  const http = { get: jest.fn() };
  let controller: StoresController;

  beforeEach(async () => {
    jest.resetAllMocks();
    http.get.mockReturnValue(of({ data: [] }));
    const moduleRef = await Test.createTestingModule({
      controllers: [StoresController],
      providers: [{ provide: HttpService, useValue: http }],
    }).compile();
    controller = moduleRef.get(StoresController);
  });

  it('lists the stores without a session', async () => {
    await controller.list();
    expect(http.get.mock.calls[0][0]).toMatch(/\/stores$/);
    expect(http.get.mock.calls[0][1].headers).not.toHaveProperty(
      'Authorization',
    );
  });

  it('reads one store by its link, encoded', async () => {
    await controller.one('loja do joão');
    expect(http.get.mock.calls[0][0]).toMatch(
      /\/stores\/loja%20do%20jo%C3%A3o$/,
    );
  });
});
