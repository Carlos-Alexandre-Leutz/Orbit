import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('auth HTTP validation', () => {
  let app: INestApplication;
  const authService = {
    register: jest.fn().mockResolvedValue({ ok: true }),
    login: jest.fn().mockResolvedValue({ ok: true }),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('strips a role sent at registration before the service sees it', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'a@example.com',
        password: 'a-good-password',
        role: 'ADMIN',
      })
      .expect(201);
    expect(authService.register).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'a-good-password',
    });
  });

  it('rejects a short password and a bad e-mail', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'a@example.com', password: 'short' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'a-good-password' })
      .expect(400);
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('rejects a login without a password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@example.com' })
      .expect(400);
  });
});
