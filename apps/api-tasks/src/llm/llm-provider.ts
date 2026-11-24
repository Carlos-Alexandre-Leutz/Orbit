export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** What the gateway asks a model provider. `jsonSchema` asks for a JSON answer in that shape. */
export interface LlmRequest {
  model: string;
  system?: string;
  messages: LlmMessage[];
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface LlmResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/** A provider failure. `retryable` says whether trying the same model again can help (limits, timeouts, 5xx). */
export class LlmProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * The port: everything the agents need from a language model, and nothing of how it is reached. The Gemini
 * adapter, the fake used in tests and development, and the "unavailable" one implement it.
 */
export abstract class LlmProvider {
  abstract generate(request: LlmRequest): Promise<LlmResponse>;
}
