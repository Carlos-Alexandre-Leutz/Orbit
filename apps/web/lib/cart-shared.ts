// Safe to import from client components (no server-only code here).

/** The most units of one product the cart accepts; the API enforces it, the page only avoids offering more. */
export const MAX_UNITS_PER_PRODUCT = 10;

export function quantityChoices(stock: number): number[] {
  const most = Math.min(stock, MAX_UNITS_PER_PRODUCT);
  return Array.from({ length: Math.max(0, most) }, (_, i) => i + 1);
}
