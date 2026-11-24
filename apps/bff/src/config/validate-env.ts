/** Variables the BFF cannot work without. ALLOWED_ORIGINS is optional: it falls back to http://localhost:3000. */
export const REQUIRED_ENV = ['TASKS_API_URL'] as const;

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
