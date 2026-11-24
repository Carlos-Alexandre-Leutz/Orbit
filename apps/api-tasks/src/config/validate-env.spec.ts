import { REQUIRED_ENV, validateEnv } from './validate-env';

const complete = Object.fromEntries(REQUIRED_ENV.map((name) => [name, 'x']));
const strongSecret = 'a'.repeat(40);

describe('validateEnv', () => {
  it('accepts a complete environment', () => {
    expect(() => validateEnv(complete)).not.toThrow();
  });

  it('names the missing variable', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('treats an empty or blank value as missing', () => {
    expect(() => validateEnv({ ...complete, DATABASE_URL: '   ' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('does not require the optional variables', () => {
    expect(REQUIRED_ENV).not.toContain('PORT');
    expect(REQUIRED_ENV).not.toContain('APP_URL');
    expect(REQUIRED_ENV).not.toContain('MAIL_HOST');
  });

  it('names a missing JWT_SECRET', () => {
    expect(() => validateEnv({ ...complete, JWT_SECRET: '' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('accepts the example secret outside production', () => {
    expect(() =>
      validateEnv({ ...complete, JWT_SECRET: 'change-me' }),
    ).not.toThrow();
  });

  it('refuses the example or a short secret in production', () => {
    for (const JWT_SECRET of ['change-me', 'too-short']) {
      expect(() =>
        validateEnv({ ...complete, JWT_SECRET, NODE_ENV: 'production' }),
      ).toThrow(/at least 32/);
    }
  });

  it('accepts a long secret in production', () => {
    expect(() =>
      validateEnv({
        ...complete,
        JWT_SECRET: strongSecret,
        NODE_ENV: 'production',
      }),
    ).not.toThrow();
  });
});
