/** The address of a picture, served by this site (which reads it from the BFF). Safe in client components. */
export function imageSrc(id: string): string {
  return `/api/images/${encodeURIComponent(id)}`;
}

const HEX = /^#[0-9a-f]{6}$/i;
export const DEFAULT_COLOR = '#2563eb';

/** A store color that is safe to put in CSS: anything that is not #rrggbb falls back to the default. */
export function safeColor(value: string | null | undefined): string {
  return value && HEX.test(value) ? value.toLowerCase() : DEFAULT_COLOR;
}

/** Black or white, whichever reads better on the given color (WCAG relative luminance). */
export function onColor(hex: string): '#000000' | '#ffffff' {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? '#000000' : '#ffffff';
}
