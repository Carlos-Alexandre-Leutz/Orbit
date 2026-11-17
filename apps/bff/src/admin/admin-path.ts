/**
 * The secret address of the owner's area, from `ADMIN_PATH` in the environment (never in the code or the
 * repository). Without a valid one the area is not registered at all: the routes simply do not exist.
 */
export function adminPath(env: NodeJS.ProcessEnv = process.env): string | null {
  const path = env.ADMIN_PATH?.trim();
  return path && /^[a-z0-9][a-z0-9-]{3,31}$/.test(path) ? path : null;
}
