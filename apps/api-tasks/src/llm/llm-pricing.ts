/** USD per one million tokens, input and output. */
export interface ModelPrice {
  input: number;
  output: number;
}

/**
 * Approximate list prices of the default models when this was written; they change. Override with
 * `LLM_PRICES_JSON`, such as `{"gemini-2.5-flash":{"input":0.3,"output":2.5}}`. A model with no price
 * costs 0 here, which the usage table cannot tell apart from a free call, so keep this list current.
 */
const DEFAULT_PRICES: Record<string, ModelPrice> = {
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
};

export function priceTable(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, ModelPrice> {
  try {
    const extra = env.LLM_PRICES_JSON
      ? (JSON.parse(env.LLM_PRICES_JSON) as Record<string, ModelPrice>)
      : {};
    return { ...DEFAULT_PRICES, ...extra };
  } catch {
    return DEFAULT_PRICES;
  }
}

/** The cost of one call in millionths of a US dollar, rounded up so a small call never shows as free. */
export function costMicroUsd(
  prices: Record<string, ModelPrice>,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = prices[model];
  if (!price) return 0;
  return Math.ceil(inputTokens * price.input + outputTokens * price.output);
}
