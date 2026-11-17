/** The contact e-mail shown on the Terms of Use and the Privacy Policy, from `SUPPORT_EMAIL`; null when not set. */
export function supportEmail(): string | null {
  return process.env.SUPPORT_EMAIL?.trim() || null;
}
