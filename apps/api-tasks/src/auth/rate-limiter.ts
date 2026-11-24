import { HttpException, HttpStatus } from '@nestjs/common';

interface Window {
  count: number;
  resetsAt: number;
}

const MAX_KEYS = 10_000;

/**
 * Counts events per key inside a fixed time window, in memory. It is per process: with several API instances
 * each one counts on its own, so the real limit is the number configured times the number of instances.
 */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  /** Counts one event for the key and refuses it when the key is over the limit inside the window. */
  consume(key: string, max: number, windowMs: number, message: string) {
    this.refuseIfBlocked(key, max, message);
    this.hit(key, windowMs);
  }

  /** Refuses the call when the key has already used up its allowance. */
  refuseIfBlocked(key: string, max: number, message: string) {
    const current = this.current(key);
    if (current && current.count >= max) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** Counts one event; the window starts at the first one. */
  hit(key: string, windowMs: number) {
    const current = this.current(key);
    if (current) {
      current.count += 1;
      return;
    }
    if (this.windows.size >= MAX_KEYS) this.dropExpired();
    this.windows.set(key, { count: 1, resetsAt: Date.now() + windowMs });
  }

  reset(key: string) {
    this.windows.delete(key);
  }

  private current(key: string) {
    const window = this.windows.get(key);
    if (window && window.resetsAt <= Date.now()) {
      this.windows.delete(key);
      return undefined;
    }
    return window;
  }

  private dropExpired() {
    const now = Date.now();
    for (const [key, window] of this.windows) {
      if (window.resetsAt <= now) this.windows.delete(key);
    }
  }
}
