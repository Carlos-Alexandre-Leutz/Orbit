/** Variables the service cannot work without. The MAIL_* ones are only needed to send the password-reset e-mail, and PORT, APP_URL and JWT_EXPIRES_IN_SECONDS have defaults. */
export const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'] as const;

const EXAMPLE_SECRET = 'change-me';
const MIN_PRODUCTION_SECRET_LENGTH = 32;

/** Fails at startup, naming every missing variable, instead of failing later on the first request. */
export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
  required: readonly string[] = REQUIRED_ENV,
): void {
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`,
    );
  }
  // The example value is fine on a laptop, never in production: anyone could forge a session with it.
  const secret = env.JWT_SECRET ?? '';
  if (
    env.NODE_ENV === 'production' &&
    (secret === EXAMPLE_SECRET || secret.length < MIN_PRODUCTION_SECRET_LENGTH)
  ) {
    throw new Error(
      `JWT_SECRET must be a random value of at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production.`,
    );
  }
}
