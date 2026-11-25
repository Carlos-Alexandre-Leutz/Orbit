import { SlidingLimiter } from './rate-limit';

describe('SlidingLimiter', () => {
  it('allows up to the limit inside the window and then refuses', () => {
    let now = 0;
    const limiter = new SlidingLimiter(2, 1000, () => now);
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
    expect(limiter.allow('b')).toBe(true);
    now = 1001;
    expect(limiter.allow('a')).toBe(true);
  });
});
