import { HttpException } from '@nestjs/common';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  afterEach(() => jest.useRealTimers());

  it('refuses with 429 once the key has used its allowance', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i += 1) limiter.consume('k', 3, 1000, 'slow down');
    try {
      limiter.consume('k', 3, 1000, 'slow down');
      throw new Error('should have refused');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('counts each key on its own', () => {
    const limiter = new RateLimiter();
    limiter.consume('a', 1, 1000, 'x');
    expect(() => limiter.consume('b', 1, 1000, 'x')).not.toThrow();
  });

  it('allows the key again after the window passes', () => {
    jest.useFakeTimers();
    const limiter = new RateLimiter();
    limiter.consume('k', 1, 1000, 'x');
    expect(() => limiter.consume('k', 1, 1000, 'x')).toThrow(HttpException);
    jest.advanceTimersByTime(1001);
    expect(() => limiter.consume('k', 1, 1000, 'x')).not.toThrow();
  });

  it('forgets the key on reset', () => {
    const limiter = new RateLimiter();
    limiter.consume('k', 1, 1000, 'x');
    limiter.reset('k');
    expect(() => limiter.consume('k', 1, 1000, 'x')).not.toThrow();
  });
});
