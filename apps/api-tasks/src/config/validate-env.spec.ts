import { REQUIRED_ENV, validateEnv } from './validate-env';

const complete = Object.fromEntries(REQUIRED_ENV.map((name) => [name, 'x']));

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
});
