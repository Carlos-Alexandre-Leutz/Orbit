import { describe, expect, it } from 'vitest';
import { barPercents, lastsLabel, parsePeriod } from './sales';

describe('parsePeriod', () => {
  it('keeps a known period and falls back to 30', () => {
    expect(parsePeriod('7')).toBe(7);
    expect(parsePeriod(['90', '7'])).toBe(90);
    for (const bad of [undefined, '', '12', 'abc', '-7']) {
      expect(parsePeriod(bad)).toBe(30);
    }
  });
});

describe('barPercents', () => {
  it('scales to the tallest day and keeps a day with a sale visible', () => {
    expect(barPercents([0, 500, 1000, 1])).toEqual([0, 50, 100, 2]);
  });
  it('is all zeros when nothing sold', () => {
    expect(barPercents([0, 0, 0])).toEqual([0, 0, 0]);
    expect(barPercents([])).toEqual([]);
  });
});

describe('lastsLabel', () => {
  it('says how long the stock lasts in plain words', () => {
    expect(lastsLabel(null)).toBe('—');
    expect(lastsLabel(0)).toBe('less than a day');
    expect(lastsLabel(1)).toBe('about 1 day');
    expect(lastsLabel(12)).toBe('about 12 days');
    expect(lastsLabel(120)).toBe('about 4 months');
  });
});
