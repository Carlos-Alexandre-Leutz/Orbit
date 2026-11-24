import { FakeLlmProvider } from './fake-llm.provider';
import { InMemoryLlmCache } from './llm-cache';
import { LlmProviderError } from './llm-provider';
import {
  LlmGatewayConfig,
  LlmInvalidOutputError,
  LlmService,
  LlmUnavailableError,
} from './llm.service';

function setup(replies: ConstructorParameters<typeof FakeLlmProvider>[0]) {
  const provider = new FakeLlmProvider(replies);
  const rows: Record<string, unknown>[] = [];
  const prisma = {
    llmCall: {
      create: jest.fn((args: { data: Record<string, unknown> }) => {
        rows.push(args.data);
        return Promise.resolve(args.data);
      }),
    },
  };
  const sleeps: number[] = [];
  const config: LlmGatewayConfig = {
    models: ['main', 'backup'],
    prices: { main: { input: 1, output: 2 } },
    timeoutMs: 1000,
    maxAttempts: 2,
    retryDelayMs: 100,
    sleep: (ms) => (sleeps.push(ms), Promise.resolve()),
  };
  const service = new LlmService(
    provider,
    new InMemoryLlmCache(),
    prisma as never,
    config,
  );
  return { service, provider, rows, sleeps, prisma };
}

const input = { messages: [{ role: 'user' as const, content: 'hello there' }] };

describe('LlmService.complete', () => {
  it('answers with the first model and records tokens, cost and latency', async () => {
    const { service, rows } = setup(['four words right here']);
    const result = await service.complete(input, { purpose: 'test' });
    expect(result).toMatchObject({
      text: 'four words right here',
      model: 'main',
      inputTokens: 2,
      outputTokens: 4,
      costMicroUsd: 2 * 1 + 4 * 2,
      cached: false,
    });
    expect(rows).toEqual([
      expect.objectContaining({
        purpose: 'test',
        model: 'main',
        outcome: 'SUCCESS',
        inputTokens: 2,
        outputTokens: 4,
        costMicroUsd: 10,
      }),
    ]);
  });

  it('retries a retryable failure with a growing wait, then succeeds', async () => {
    const { service, sleeps, rows, provider } = setup([
      new LlmProviderError('busy', true, 429),
      'fine',
    ]);
    const result = await service.complete(input, { purpose: 'test' });
    expect(result.model).toBe('main');
    expect(provider.requests).toHaveLength(2);
    expect(sleeps).toEqual([100]);
    expect(rows.map((r) => r.outcome)).toEqual(['FAILURE', 'SUCCESS']);
  });

  it('falls back to the next model after the attempts run out', async () => {
    const busy = new LlmProviderError('busy', true, 503);
    const { service, provider } = setup([busy, busy, 'from backup']);
    const result = await service.complete(input, { purpose: 'test' });
    expect(result).toMatchObject({ model: 'backup', text: 'from backup' });
    expect(provider.requests.map((r) => r.model)).toEqual([
      'main',
      'main',
      'backup',
    ]);
  });

  it('does not retry a failure that cannot be fixed by waiting, but still tries the next model', async () => {
    const { service, provider, sleeps } = setup([
      new LlmProviderError('bad request', false, 400),
      'from backup',
    ]);
    await service.complete(input, { purpose: 'test' });
    expect(provider.requests.map((r) => r.model)).toEqual(['main', 'backup']);
    expect(sleeps).toEqual([]);
  });

  it('gives up with the last error when every model fails', async () => {
    const down = new LlmProviderError('down', true, 503);
    const { service } = setup([down]);
    await expect(
      service.complete(input, { purpose: 'test' }),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it('asks the provider for a timeout on every attempt', async () => {
    const { service, provider } = setup(['ok']);
    await service.complete(input, { purpose: 'test', timeoutMs: 50 });
    expect(provider.requests[0].signal).toBeInstanceOf(AbortSignal);
  });

  it('serves a repeated request from the cache when asked, at no cost', async () => {
    const { service, provider, rows } = setup(['same answer']);
    const first = await service.complete(input, {
      purpose: 'test',
      cache: true,
    });
    const second = await service.complete(input, {
      purpose: 'test',
      cache: true,
    });
    expect(provider.requests).toHaveLength(1);
    expect(second).toMatchObject({
      text: first.text,
      cached: true,
      costMicroUsd: 0,
      latencyMs: 0,
    });
    expect(rows.map((r) => r.cached)).toEqual([false, true]);
  });

  it('does not cache unless asked', async () => {
    const { service, provider } = setup(['a']);
    await service.complete(input, { purpose: 'test' });
    await service.complete(input, { purpose: 'test' });
    expect(provider.requests).toHaveLength(2);
  });

  it('keeps answering when the usage record cannot be written', async () => {
    const { service, prisma } = setup(['ok']);
    prisma.llmCall.create.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.complete(input, { purpose: 'test' }),
    ).resolves.toMatchObject({ text: 'ok' });
  });

  it('never stores the prompt or the answer', async () => {
    const { service, rows } = setup(['secret answer']);
    await service.complete(
      { messages: [{ role: 'user', content: 'secret prompt' }] },
      { purpose: 'test' },
    );
    expect(JSON.stringify(rows)).not.toMatch(/secret/);
  });
});

describe('LlmService.completeStructured', () => {
  const validate = (value: unknown) => {
    const v = value as { intent?: string };
    if (typeof v?.intent !== 'string') throw new Error('intent is missing');
    return { intent: v.intent };
  };

  it('returns the validated value, even inside a code fence', async () => {
    const { service } = setup(['```json\n{"intent":"buy"}\n```']);
    const { value } = await service.completeStructured(input, {
      purpose: 'test',
      validate,
    });
    expect(value).toEqual({ intent: 'buy' });
  });

  it('sends a wrong answer back with the reason and accepts the corrected one', async () => {
    const { service, provider } = setup(['not json', '{"intent":"track"}']);
    const { value } = await service.completeStructured(input, {
      purpose: 'test',
      validate,
    });
    expect(value).toEqual({ intent: 'track' });
    const second = provider.requests[1].messages;
    expect(second.at(-1)?.content).toMatch(/not valid JSON/);
    expect(second.at(-2)).toEqual({ role: 'assistant', content: 'not json' });
  });

  it('rejects an answer that stays invalid after the repairs', async () => {
    const { service, provider } = setup(['{"x":1}']);
    await expect(
      service.completeStructured(input, {
        purpose: 'test',
        validate,
        maxRepairs: 2,
      }),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
    expect(provider.requests).toHaveLength(3);
  });
});
