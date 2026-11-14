/** Variables the service cannot work without. The MAIL_* ones are only needed to send the password-reset e-mail, and PORT and APP_URL have defaults. */
export const REQUIRED_ENV = ['DATABASE_URL'] as const;

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
}
