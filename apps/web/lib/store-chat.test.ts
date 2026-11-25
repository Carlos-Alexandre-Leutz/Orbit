import { describe, expect, it, vi } from 'vitest';
import { askStore, MAX_HISTORY, recentHistory } from './store-chat';

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('recentHistory', () => {
  it('keeps only the last messages the API accepts', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      role: 'user' as const,
      content: `m${i}`,
    }));
    const kept = recentHistory(many);
    expect(kept).toHaveLength(MAX_HISTORY);
    expect(kept[0]?.content).toBe('m15');
  });
});

describe('askStore', () => {
  it('posts to the store link and returns the answer', async () => {
    const fetcher = vi.fn(() =>
      reply(201, { message: 'We have mugs.', status: 'answered' }),
    );
    const out = await askStore(
      'loja-do-joao',
      'visitor-id',
      'Do you have mugs?',
      [],
      fetcher as never,
    );
    expect(out).toEqual({ ok: true, text: 'We have mugs.' });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/bff/stores/loja-do-joao/chat',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows the limit message when there are too many questions', async () => {
    const fetcher = () => reply(429, { message: 'Too many questions' });
    expect(await askStore('s', 'v', 'hi', [], fetcher as never)).toEqual({
      ok: false,
      text: 'Too many questions',
    });
  });

  it('does not throw when the server is down', async () => {
    const fetcher = () => Promise.reject(new Error('offline'));
    expect(await askStore('s', 'v', 'hi', [], fetcher as never)).toEqual({
      ok: false,
      text: 'The assistant could not be reached.',
    });
  });
});
