import { FakeLlmProvider } from './fake-llm.provider';
import { GeminiLlmProvider } from './gemini-llm.provider';
import { LlmProvider } from './llm-provider';
import { UnavailableLlmProvider } from './unavailable-llm.provider';

/**
 * Gemini when `GEMINI_API_KEY` is set; otherwise the fake, except in production, where the fake would
 * invent answers, so the provider refuses every call.
 */
export function createLlmProvider(
  env: NodeJS.ProcessEnv = process.env,
): LlmProvider {
  const key = env.GEMINI_API_KEY?.trim();
  if (key) return new GeminiLlmProvider(key);
  if (env.NODE_ENV === 'production') return new UnavailableLlmProvider();
  return new FakeLlmProvider();
}

/** The models to try in order: `LLM_MODELS` (comma separated), else a main model and a cheaper fallback. */
export function llmModels(env: NodeJS.ProcessEnv = process.env): string[] {
  const models = (env.LLM_MODELS ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return models.length ? models : ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
}
