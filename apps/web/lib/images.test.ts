import { describe, expect, it } from 'vitest';
import { imageSrc, onColor, safeColor } from './images';

describe('store colors and pictures', () => {
  it('keeps a valid color and falls back for anything else', () => {
    expect(safeColor('#16A34A')).toBe('#16a34a');
    expect(safeColor('red')).toBe('#2563eb');
    expect(safeColor('#fff; background:url(x)')).toBe('#2563eb');
    expect(safeColor(null)).toBe('#2563eb');
  });

  it('picks readable text for light and dark colors', () => {
    expect(onColor('#ffff00')).toBe('#000000');
    expect(onColor('#1e3a8a')).toBe('#ffffff');
  });

  it('builds the picture address from the id only', () => {
    expect(imageSrc('abc')).toBe('/api/images/abc');
    expect(imageSrc('a/b')).toBe('/api/images/a%2Fb');
  });
});
