import { LlmProvider, LlmProviderError } from './llm-provider';

/** Used in production without an API key: every call fails loudly instead of answering with a fake. */
export class UnavailableLlmProvider extends LlmProvider {
  generate(): Promise<never> {
    return Promise.reject(
      new LlmProviderError('No language model is configured', false),
    );
  }
}
