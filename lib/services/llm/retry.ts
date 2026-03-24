/**
 * LLM Retry Logic
 *
 * Exponential backoff retry logic for LLM requests.
 */

import { LLMTimeoutError, LLMRetryExhaustedError } from './errors';
import type { RetryConfig } from './types';

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: initialDelay * 2^attempt
  const exponentialDelay = config.initialDelay * Math.pow(2, attempt);
  // Add jitter: random value between 0 and 1000ms
  const jitter = Math.random() * 1000;
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Create a timeout promise
 */
function createTimeoutPromise<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new LLMTimeoutError()), ms);
  });
}

/**
 * Execute a function with retry logic
 *
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @param context - Context for error messages
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  context: string = 'operation',
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Race between the function and timeout
      const result = await Promise.race([
        fn(),
        createTimeoutPromise<T>(config.timeout),
      ]);

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if it's a validation error (won't change with retry)
      if (lastError.name === 'LLMValidationError') {
        throw lastError;
      }

      // Don't retry if it's a timeout on the last attempt
      if (lastError.name === 'LLMTimeoutError' && attempt >= config.maxRetries) {
        throw lastError;
      }

      // If not the last attempt, wait and retry
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        console.warn(
          `[LLM Retry] ${context} failed (attempt ${attempt + 1}/${config.maxRetries + 1}), ` +
            `retrying in ${delay.toFixed(0)}ms...`,
          lastError.message,
        );
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw new LLMRetryExhaustedError(
    `${context} failed after ${config.maxRetries + 1} attempts`,
    config.maxRetries + 1,
    lastError || new Error('Unknown error'),
  );
}

/**
 * Execute a function without retry (for operations that shouldn't be retried)
 */
export async function withoutRetry<T>(
  fn: () => Promise<T>,
  timeout: number,
): Promise<T> {
  return Promise.race([
    fn(),
    createTimeoutPromise<T>(timeout),
  ]);
}
