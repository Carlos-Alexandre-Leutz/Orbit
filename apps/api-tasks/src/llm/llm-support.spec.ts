import { InMemoryLlmCache, cacheKey } from './llm-cache';
import { createLlmProvider, llmModels } from './llm-provider.factory';
import { costMicroUsd, priceTable } from './llm-pricing';
import { FakeLlmProvider } from './fake-llm.provider';
import { GeminiLlmProvider } from './gemini-llm.provider';
import { UnavailableLlmProvider } from './unavailable-llm.provider';

describe('LLM cache', () => {
  it('expires entries and drops the oldest when full', () => {
    let now = 0;
    const cache = new InMemoryLlmCache(1000, 2, () => now);
    const answer = { text: 'x', model: 'm', inputTokens: 1, outputTokens: 1 };
    cache.set('a', answer);
    cache.set('b', answer);
    cache.set('c', answer);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toEqual(answer);
    now = 1000;
    expect(cache.get('c')).toBeUndefined();
  });

  it('gives the same key to the same request and another to a different one', () => {
    expect(cacheKey({ a: 1 })).toBe(cacheKey({ a: 1 }));
    expect(cacheKey({ a: 1 })).not.toBe(cacheKey({ a: 2 }));
  });
});

describe('LLM pricing', () => {
  it('rounds the cost up and treats an unpriced model as free', () => {
    const prices = { m: { input: 0.3, output: 2.5 } };
    expect(costMicroUsd(prices, 'm', 10, 1)).toBe(Math.ceil(10 * 0.3 + 2.5));
    expect(costMicroUsd(prices, 'other', 10, 1)).toBe(0);
  });

  it('lets LLM_PRICES_JSON override a price and ignores broken JSON', () => {
    const custom = priceTable({
      LLM_PRICES_JSON: '{"gemini-2.5-flash":{"input":9,"output":9}}',
    });
    expect(custom['gemini-2.5-flash']).toEqual({ input: 9, output: 9 });
    expect(
      priceTable({ LLM_PRICES_JSON: '{nope' })['gemini-2.5-flash'],
    ).toBeDefined();
  });
});

describe('LLM provider factory', () => {
  it('uses Gemini with a key, the fake in development and refuses in production', () => {
    expect(createLlmProvider({ GEMINI_API_KEY: 'k' })).toBeInstanceOf(
      GeminiLlmProvider,
    );
    expect(createLlmProvider({})).toBeInstanceOf(FakeLlmProvider);
    expect(createLlmProvider({ NODE_ENV: 'production' })).toBeInstanceOf(
      UnavailableLlmProvider,
    );
  });

  it('reads the model list from LLM_MODELS or falls back to the defaults', () => {
    expect(llmModels({ LLM_MODELS: ' a , b ' })).toEqual(['a', 'b']);
    expect(llmModels({}).length).toBeGreaterThanOrEqual(2);
  });
});
