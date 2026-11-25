import { LlmProvider, LlmRequest, LlmResponse } from './llm-provider';

type Reply = string | Error | ((request: LlmRequest) => string);

/**
 * A scripted model for tests and development: it answers with the next reply in the list (the last one
 * repeats), counts tokens as words and remembers every request it received.
 */
export class FakeLlmProvider extends LlmProvider {
  readonly requests: LlmRequest[] = [];
  private index = 0;

  constructor(private readonly replies: Reply[] = ['OK']) {
    super();
  }

  generate(request: LlmRequest): Promise<LlmResponse> {
    this.requests.push(request);
    const reply = this.replies[Math.min(this.index++, this.replies.length - 1)];
    if (reply instanceof Error) return Promise.reject(reply);
    const text = typeof reply === 'function' ? reply(request) : reply;
    const words = (value: string) => value.split(/\s+/).filter(Boolean).length;
    const input = request.messages.reduce(
      (sum, m) => sum + words(m.content),
      0,
    );
    return Promise.resolve({
      text,
      inputTokens: input + words(request.system ?? ''),
      outputTokens: words(text),
    });
  }
}
