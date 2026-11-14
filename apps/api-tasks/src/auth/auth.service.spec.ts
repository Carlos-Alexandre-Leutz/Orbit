import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

const SECRET = 'a-test-secret-that-is-long-enough-1234';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'ana@example.com',
    name: 'Ana',
    password: bcrypt.hashSync('correct-password', 4),
    role: 'CUSTOMER',
    isAnonymous: false,
    expiresAt: null,
    passwordResetToken: 'secret-reset-token',
    passwordResetExpires: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let users: Map<string, ReturnType<typeof makeUser>>;
  let service: AuthService;
  let jwt: JwtService;
  const prisma = {
    user: {
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(users.get(where.email) ?? null),
      ),
      create: jest.fn(({ data }) => {
        const user = makeUser({ ...data, id: 'new-id' });
        users.set(user.email, user);
        return Promise.resolve(user);
      }),
    },
  };

  beforeEach(() => {
    users = new Map();
    jest.clearAllMocks();
    jwt = new JwtService({ secret: SECRET, signOptions: { expiresIn: 60 } });
    service = new AuthService(prisma as never, {} as never, jwt);
  });

  describe('register', () => {
    it('creates a customer and returns a signed session', async () => {
      const session = await service.register({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'a-good-password',
      });
      const payload = await jwt.verifyAsync(session.accessToken);
      expect(payload.sub).toBe('new-id');
      expect(payload.role).toBe('CUSTOMER');
      expect(payload.exp - payload.iat).toBe(60);
      expect(session.user.role).toBe('CUSTOMER');
    });

    it('ignores a role sent by the caller', async () => {
      await service.register({
        email: 'evil@example.com',
        password: 'a-good-password',
        role: 'ADMIN',
      } as never);
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('CUSTOMER');
    });

    it('stores a hash, never the password', async () => {
      await service.register({
        email: 'ana@example.com',
        password: 'a-good-password',
      });
      const stored = prisma.user.create.mock.calls[0][0].data.password;
      expect(stored).not.toBe('a-good-password');
      expect(await bcrypt.compare('a-good-password', stored)).toBe(true);
    });

    it('never returns the password hash or the reset fields', async () => {
      const session = await service.register({
        email: 'ana@example.com',
        password: 'a-good-password',
      });
      expect(Object.keys(session.user).sort()).toEqual(
        ['createdAt', 'email', 'id', 'isAnonymous', 'name', 'role'].sort(),
      );
    });

    it('answers conflict for a duplicate e-mail', async () => {
      users.set('ana@example.com', makeUser());
      await expect(
        service.register({
          email: 'ana@example.com',
          password: 'a-good-password',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a session for the right password', async () => {
      users.set('ana@example.com', makeUser({ role: 'SELLER' }));
      const session = await service.login({
        email: 'ana@example.com',
        password: 'correct-password',
      });
      const payload = await jwt.verifyAsync(session.accessToken);
      expect(payload).toMatchObject({ sub: 'u1', role: 'SELLER' });
    });

    it('gives the same error for a wrong password and an unknown e-mail', async () => {
      users.set('ana@example.com', makeUser());
      const failure = async (email: string) => {
        try {
          await service.login({ email, password: 'nope' });
        } catch (error) {
          return error;
        }
      };
      const wrong = await failure('ana@example.com');
      const unknown = await failure('ghost@example.com');
      expect(wrong).toBeInstanceOf(UnauthorizedException);
      expect(unknown).toBeInstanceOf(UnauthorizedException);
      expect((wrong as Error).message).toBe((unknown as Error).message);
    });

    it('does not let an anonymous account log in with a password', async () => {
      users.set(
        'anon@anonymous.orbit.invalid',
        makeUser({
          email: 'anon@anonymous.orbit.invalid',
          isAnonymous: true,
        }),
      );
      await expect(
        service.login({
          email: 'anon@anonymous.orbit.invalid',
          password: 'correct-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('anonymous visitors', () => {
    afterEach(() => {
      delete process.env.ANONYMOUS_TTL_HOURS;
    });

    it('creates a temporary customer whose token lasts as long as the account', async () => {
      process.env.ANONYMOUS_TTL_HOURS = '2';
      const session = await service.createAnonymous();
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ role: 'CUSTOMER', isAnonymous: true });
      expect(data.email).toMatch(/^anon-.+@anonymous\.orbit\.invalid$/);
      expect((data.expiresAt as Date).getTime() - Date.now()).toBeGreaterThan(
        2 * 3600 * 1000 - 5000,
      );
      const payload = await jwt.verifyAsync(session.accessToken);
      expect(payload.exp - payload.iat).toBe(2 * 3600);
      expect(session.user.isAnonymous).toBe(true);
    });

    it('defaults to 24 hours', async () => {
      const session = await service.createAnonymous();
      const payload = await jwt.verifyAsync(session.accessToken);
      expect(payload.exp - payload.iat).toBe(24 * 3600);
    });

    it('gives each visitor a different account', async () => {
      await service.createAnonymous();
      await service.createAnonymous();
      const [a, b] = prisma.user.create.mock.calls.map((c) => c[0].data.email);
      expect(a).not.toBe(b);
    });

    it('refuses the session of an expired anonymous account', async () => {
      const expired = makeUser({
        id: 'a1',
        isAnonymous: true,
        expiresAt: new Date(Date.now() - 1000),
      });
      prisma.user.findUnique.mockResolvedValueOnce(expired);
      await expect(service.me('a1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('still serves an anonymous account that has not expired', async () => {
      const live = makeUser({
        id: 'a1',
        isAnonymous: true,
        expiresAt: new Date(Date.now() + 60000),
      });
      prisma.user.findUnique.mockResolvedValueOnce(live);
      await expect(service.me('a1')).resolves.toMatchObject({ id: 'a1' });
    });

    it('deletes only expired anonymous accounts', async () => {
      await expect(service.deleteExpiredAnonymous()).resolves.toBe(3);
      const where = prisma.user.deleteMany.mock.calls[0][0].where;
      expect(where.isAnonymous).toBe(true);
      expect(where.expiresAt.lt).toBeInstanceOf(Date);
    });
  });
});
