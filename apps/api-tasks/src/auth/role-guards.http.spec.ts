import { Controller, Get, INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { Auth } from './roles.decorator';

const SECRET = 'a-test-secret-that-is-long-enough-1234';

@Controller('probe')
class ProbeController {
  @Get('any')
  @Auth()
  any() {
    return 'any';
  }

  @Get('seller')
  @Auth('SELLER', 'ADMIN')
  seller() {
    return 'seller';
  }

  @Get('admin')
  @Auth('ADMIN')
  admin() {
    return 'admin';
  }
}

describe('role guards', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ global: true, secret: SECRET })],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(() => app.close());

  const tokenFor = (role: Role) =>
    jwt.sign({ sub: 'u1', role }, { expiresIn: 60 });
  const get = (path: string, token?: string) => {
    const call = request(app.getHttpServer()).get(path);
    return token ? call.set('Authorization', `Bearer ${token}`) : call;
  };

  describe('without a usable session the answer is 401', () => {
    it.each(['any', 'seller', 'admin'])(
      '/probe/%s with no header',
      async (route) => {
        await get(`/probe/${route}`).expect(401);
      },
    );

    it('a malformed token', async () => {
      await get('/probe/any', 'not-a-token').expect(401);
    });

    it('a token signed with another secret', async () => {
      const forged = new JwtService({
        secret: 'another-secret-another-secret-12345',
      }).sign({
        sub: 'u1',
        role: 'ADMIN',
      });
      await get('/probe/admin', forged).expect(401);
    });

    it('an expired token', async () => {
      const expired = jwt.sign(
        { sub: 'u1', role: 'ADMIN' },
        { expiresIn: -10 },
      );
      await get('/probe/admin', expired).expect(401);
    });

    it('a token whose role is not a known role', async () => {
      const odd = jwt.sign({ sub: 'u1', role: 'SUPERUSER' }, { expiresIn: 60 });
      await get('/probe/any', odd).expect(401);
    });

    it('a header that is not a Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/probe/any')
        .set('Authorization', `Basic ${tokenFor('ADMIN')}`)
        .expect(401);
    });
  });

  describe('with a valid session, by role', () => {
    const expectations: Array<[Role, Record<string, number>]> = [
      ['CUSTOMER', { any: 200, seller: 403, admin: 403 }],
      ['SELLER', { any: 200, seller: 200, admin: 403 }],
      ['ADMIN', { any: 200, seller: 200, admin: 200 }],
    ];

    it.each(expectations)('%s', async (role, routes) => {
      for (const [route, status] of Object.entries(routes)) {
        const res = await get(`/probe/${route}`, tokenFor(role));
        expect([role, route, res.status]).toEqual([role, route, status]);
      }
    });
  });
});
