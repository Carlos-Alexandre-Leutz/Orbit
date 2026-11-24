import { createHash } from 'node:crypto';

export interface CachedAnswer {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** The port for repeated answers. The default is in memory; a shared store can replace it later. */
export abstract class LlmCache {
  abstract get(key: string): CachedAnswer | undefined;
  abstract set(key: string, answer: CachedAnswer): void;
}

/** Keeps the most recent answers for a short time. It lives and dies with the process. */
export class InMemoryLlmCache extends LlmCache {
  private readonly entries = new Map<
    string,
    { answer: CachedAnswer; expiresAt: number }
  >();

  constructor(
    private readonly ttlMs = 5 * 60_000,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {
    super();
  }

  get(key: string): CachedAnswer | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.answer;
  }

  set(key: string, answer: CachedAnswer): void {
    if (this.entries.size >= this.maxEntries) {
      // Maps keep insertion order, so the first key is the oldest.
      const oldest = this.entries.keys().next().value as string;
      this.entries.delete(oldest);
    }
    this.entries.set(key, { answer, expiresAt: this.now() + this.ttlMs });
  }
}

export function cacheKey(parts: unknown): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
