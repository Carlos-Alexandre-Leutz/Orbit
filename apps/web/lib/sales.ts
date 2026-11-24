export const PERIODS = [7, 30, 90] as const;

/** Reads `?days=` from the address; anything but a known period means 30. */
export function parsePeriod(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return (PERIODS as readonly number[]).includes(value) ? value : 30;
}

/** The height of each bar of a chart as a whole percent of the tallest; a day with no sale is 0. */
export function barPercents(values: number[]): number[] {
  const max = Math.max(0, ...values);
  if (max === 0) return values.map(() => 0);
  return values.map((v) => (v === 0 ? 0 : Math.max(2, Math.round((v / max) * 100))));
}

/** "about 3 days", "about 4 months", or a dash when nothing sold and there is no pace to go by. */
export function lastsLabel(daysLeft: number | null): string {
  if (daysLeft === null) return '—';
  if (daysLeft <= 0) return 'less than a day';
  if (daysLeft === 1) return 'about 1 day';
  if (daysLeft < 60) return `about ${daysLeft} days`;
  return `about ${Math.round(daysLeft / 30)} months`;
}
