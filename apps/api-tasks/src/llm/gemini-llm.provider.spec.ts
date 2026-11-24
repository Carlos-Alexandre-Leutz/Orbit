import { GeminiLlmProvider } from './gemini-llm.provider';
import { LlmProviderError } from './llm-provider';

function answer(body: unknown, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const request = {
  model: 'gemini-2.5-flash',
  system: 'Be brief',
  messages: [
    { role: 'user' as const, content: 'hi' },
    { role: 'assistant' as const, content: 'hello' },
    { role: 'user' as const, content: 'again' },
  ],
  temperature: 0,
  jsonSchema: { type: 'object' },
};

describe('GeminiLlmProvider', () => {
  it('builds the request in the generateContent format and reads text and usage', async () => {
    const http = answer({
      candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] } }],
      usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 3 },
    });
    const result = await new GeminiLlmProvider('key', http as never).generate(
      request,
    );
    expect(result).toEqual({
      text: '{"a":1}',
      inputTokens: 7,
      outputTokens: 3,
    });
    const [url, init] = http.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/models/gemini-2.5-flash:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(
      'key',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      systemInstruction: { parts: [{ text: 'Be brief' }] },
      contents: [
        { role: 'user', parts: [{ text: 'hi' }] },
        { role: 'model', parts: [{ text: 'hello' }] },
        { role: 'user', parts: [{ text: 'again' }] },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: { type: 'object' },
      },
    });
  });

  it.each([
    [429, true],
    [503, true],
    [400, false],
    [403, false],
  ])('marks status %i as retryable=%s', async (status, retryable) => {
    const provider = new GeminiLlmProvider('key', answer({}, status) as never);
    await expect(provider.generate(request)).rejects.toMatchObject({
      retryable,
      status,
    });
  });

  it('treats a dropped connection and an empty answer as retryable', async () => {
    const offline = jest.fn().mockRejectedValue(new Error('timeout'));
    await expect(
      new GeminiLlmProvider('key', offline as never).generate(request),
    ).rejects.toBeInstanceOf(LlmProviderError);
    await expect(
      new GeminiLlmProvider(
        'key',
        answer({ candidates: [] }) as never,
      ).generate(request),
    ).rejects.toMatchObject({ retryable: true });
  });
});
