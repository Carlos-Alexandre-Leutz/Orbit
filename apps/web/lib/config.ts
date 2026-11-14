/**
 * Address of the BFF as seen by the web server. In Compose the server reaches it by service name
 * (BFF_URL); outside Compose it falls back to the public address.
 */
export function bffUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return (
    env.BFF_URL ||
    env.NEXT_PUBLIC_BFF_URL ||
    'http://localhost:3001'
  ).replace(/\/+$/, '');
}
