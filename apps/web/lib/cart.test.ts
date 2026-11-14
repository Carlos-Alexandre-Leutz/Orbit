import { describe, expect, it } from 'vitest';
import { quantityChoices } from './cart';

describe('quantityChoices', () => {
  it('offers 1 up to the stock', () => {
    expect(quantityChoices(3)).toEqual([1, 2, 3]);
  });

  it('never offers more than 10 units, whatever the stock', () => {
    expect(quantityChoices(500)).toHaveLength(10);
    expect(quantityChoices(500).at(-1)).toBe(10);
  });

  it('offers nothing when there is no stock', () => {
    expect(quantityChoices(0)).toEqual([]);
    expect(quantityChoices(-2)).toEqual([]);
  });
});
