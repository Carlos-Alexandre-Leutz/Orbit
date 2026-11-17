/** The link of a store: `/<slug>`. Pure rules, so they can be tested without a database. */
export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/** Words the site itself uses as the first part of a path; a store may never take one. */
export const RESERVED_SLUGS: readonly string[] = [
  'api',
  'admin',
  'auth',
  'cart',
  'catalog',
  'checkout',
  'dashboard',
  'forgot-password',
  'login',
  'logout',
  'orbit',
  'orders',
  'panel',
  'payments',
  'products',
  'register',
  'sell',
  'account',
  'reset-password',
  'seller',
  'terms',
  'privacy',
  'stores',
  'static',
  'health',
  '_next',
];

const SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type SlugProblem = 'TOO_SHORT' | 'TOO_LONG' | 'BAD_SHAPE' | 'RESERVED';

/** Returns why a slug cannot be a store link, or null when it can. */
export function checkSlug(slug: string): SlugProblem | null {
  if (slug.length < SLUG_MIN) return 'TOO_SHORT';
  if (slug.length > SLUG_MAX) return 'TOO_LONG';
  if (!SHAPE.test(slug)) return 'BAD_SHAPE';
  if (RESERVED_SLUGS.includes(slug)) return 'RESERVED';
  return null;
}

export const SLUG_MESSAGES: Record<SlugProblem, string> = {
  TOO_SHORT: `The link must have at least ${SLUG_MIN} characters`,
  TOO_LONG: `The link must have at most ${SLUG_MAX} characters`,
  BAD_SHAPE:
    'The link may only have lower case letters, digits and single hyphens, and cannot start or end with a hyphen',
  RESERVED: 'This link is reserved by the site; choose another',
};

/** A suggestion for a link from a store name; the caller still checks it with checkSlug. */
export function slugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}
