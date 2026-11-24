import { Injectable, Logger } from '@nestjs/common';
import { currentCorrelationId, recordStep } from '../correlation/correlation';
import { PrismaService } from '../prisma/prisma.service';
import { cacheKey, LlmCache } from './llm-cache';
import { costMicroUsd, ModelPrice } from './llm-pricing';
import {
  LlmMessage,
  LlmProvider,
  LlmProviderError,
  LlmRequest,
} from './llm-provider';

export interface LlmOptions {
  /** What the caller wants, such as `router`; recorded with every call. */
  purpose: string;
  /** Models to try in order. Defaults to the configured list. */
  models?: string[];
  /** Per attempt. */
  timeoutMs?: number;
  /** Attempts per model before the next model is tried. */
  maxAttempts?: number;
  /** Serve and store repeated answers. Only worth it for a request that always has the same right answer. */
  cache?: boolean;
}

export interface LlmCompletion {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
  latencyMs: number;
  cached: boolean;
}

export type LlmInput = Omit<LlmRequest, 'model' | 'signal'>;

/** Every model failed. `cause` is the last error. */
export class LlmUnavailableError extends Error {
  constructor(readonly cause: Error) {
    super(`No model could answer: ${cause.message}`);
  }
}

/** The model kept answering something that does not fit the expected shape. */
export class LlmInvalidOutputError extends Error {
  constructor(
    readonly reason: string,
    readonly lastText: string,
  ) {
    super(`The model's answer is not valid: ${reason}`);
  }
}

export interface LlmGatewayConfig {
  models: string[];
  prices: Record<string, ModelPrice>;
  timeoutMs: number;
  maxAttempts: number;
  retryDelayMs: number;
  sleep: (ms: number) => Promise<void>;
}

export const LLM_CONFIG = 'LLM_CONFIG';

/**
 * The only way the agents reach a model. It adds what a provider does not: a timeout and retries with a
 * growing wait, a fallback to the next model, answers checked against a schema, a record of tokens, cost and
 * latency for every call, and an optional cache. Prompts and answers are never stored, only their size.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly provider: LlmProvider,
    private readonly cache: LlmCache,
    private readonly prisma: PrismaService,
    private readonly config: LlmGatewayConfig,
  ) {}

  async complete(input: LlmInput, options: LlmOptions): Promise<LlmCompletion> {
    const models = options.models ?? this.config.models;
    const key = options.cache ? cacheKey({ models, input }) : undefined;
    if (key) {
      const hit = this.cache.get(key);
      if (hit) {
        await this.record(options.purpose, hit.model, {
          outcome: 'SUCCESS',
          cached: true,
          inputTokens: hit.inputTokens,
          outputTokens: hit.outputTokens,
          costMicroUsd: 0,
          latencyMs: 0,
        });
        return {
          ...hit,
          costMicroUsd: 0,
          latencyMs: 0,
          cached: true,
        };
      }
    }

    const attempts = options.maxAttempts ?? this.config.maxAttempts;
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    let lastError: Error = new Error('No model is configured');

    for (const model of models) {
      for (let attempt = 1; attempt <= attempts; attempt++) {
        const started = Date.now();
        try {
          const answer = await this.provider.generate({
            ...input,
            model,
            signal: AbortSignal.timeout(timeoutMs),
          });
          const latencyMs = Date.now() - started;
          const cost = costMicroUsd(
            this.config.prices,
            model,
            answer.inputTokens,
            answer.outputTokens,
          );
          await this.record(options.purpose, model, {
            outcome: 'SUCCESS',
            cached: false,
            inputTokens: answer.inputTokens,
            outputTokens: answer.outputTokens,
            costMicroUsd: cost,
            latencyMs,
          });
          if (key) this.cache.set(key, { ...answer, model });
          return {
            text: answer.text,
            model,
            inputTokens: answer.inputTokens,
            outputTokens: answer.outputTokens,
            costMicroUsd: cost,
            latencyMs,
            cached: false,
          };
        } catch (error) {
          lastError = error as Error;
          await this.record(options.purpose, model, {
            outcome: 'FAILURE',
            cached: false,
            inputTokens: 0,
            outputTokens: 0,
            costMicroUsd: 0,
            latencyMs: Date.now() - started,
            error: lastError.message,
          });
          const retryable =
            !(error instanceof LlmProviderError) || error.retryable;
          if (!retryable) break;
          if (attempt < attempts) {
            await this.config.sleep(
              this.config.retryDelayMs * 2 ** (attempt - 1),
            );
          }
        }
      }
    }
    throw new LlmUnavailableError(lastError);
  }

  /**
   * Asks for JSON and checks it with `validate`, which throws when the value does not fit. A wrong answer
   * is sent back to the model with the reason, up to `maxRepairs` times; after that it is rejected.
   */
  async completeStructured<T>(
    input: LlmInput,
    options: LlmOptions & {
      validate: (value: unknown) => T;
      maxRepairs?: number;
    },
  ): Promise<{ value: T; completion: LlmCompletion }> {
    const { validate, maxRepairs = 1, ...rest } = options;
    const messages: LlmMessage[] = [...input.messages];
    let reason = '';
    let text = '';
    for (let repair = 0; repair <= maxRepairs; repair++) {
      const completion = await this.complete(
        { ...input, messages },
        // A repair must ask the model again, so only the first try may come from the cache.
        { ...rest, cache: repair === 0 ? rest.cache : false },
      );
      text = completion.text;
      try {
        return { value: validate(parseJson(text)), completion };
      } catch (error) {
        reason = (error as Error).message;
        messages.push(
          { role: 'assistant', content: text },
          {
            role: 'user',
            content: `That answer is not valid (${reason}). Answer again with only the corrected JSON.`,
          },
        );
      }
    }
    throw new LlmInvalidOutputError(reason, text);
  }

  private async record(
    purpose: string,
    model: string,
    data: {
      outcome: 'SUCCESS' | 'FAILURE';
      cached: boolean;
      inputTokens: number;
      outputTokens: number;
      costMicroUsd: number;
      latencyMs: number;
      error?: string;
    },
  ) {
    recordStep('llm.call', { purpose, model, ...data });
    try {
      await this.prisma.llmCall.create({
        data: {
          ...data,
          purpose,
          model,
          correlationId: currentCorrelationId() ?? null,
          error: data.error?.slice(0, 500),
        },
      });
    } catch (error) {
      // The record must never make a model call fail.
      this.logger.warn(
        `Could not record the LLM call: ${(error as Error).message}`,
      );
    }
  }
}

/** Reads a JSON answer, tolerating the code fence some models wrap around it. */
export function parseJson(text: string): unknown {
  const body = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('it is not valid JSON');
  }
}
