import {
  LlmProvider,
  LlmProviderError,
  LlmRequest,
  LlmResponse,
} from './llm-provider';

const API = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiAnswer {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/**
 * The Gemini adapter (REST, `generateContent`). It follows the public documentation and has **never run
 * against the real API**: there is no key in this project yet. The first real call may need adjustments.
 */
export class GeminiLlmProvider extends LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly http: typeof fetch = fetch,
  ) {
    super();
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    let response: Response;
    try {
      response = await this.http(
        `${API}/models/${encodeURIComponent(request.model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            ...(request.system
              ? { systemInstruction: { parts: [{ text: request.system }] } }
              : {}),
            contents: request.messages.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
            generationConfig: {
              ...(request.temperature !== undefined
                ? { temperature: request.temperature }
                : {}),
              ...(request.jsonSchema
                ? {
                    responseMimeType: 'application/json',
                    responseSchema: request.jsonSchema,
                  }
                : {}),
            },
          }),
          signal: request.signal,
        },
      );
    } catch (error) {
      // A timeout or a dropped connection: worth trying again.
      throw new LlmProviderError(
        `Gemini call failed: ${(error as Error).message}`,
        true,
      );
    }
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new LlmProviderError(
        `Gemini answered ${response.status}`,
        retryable,
        response.status,
      );
    }
    const data = (await response.json().catch(() => ({}))) as GeminiAnswer;
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('');
    if (!text) throw new LlmProviderError('Gemini returned no text', true);
    return {
      text,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
