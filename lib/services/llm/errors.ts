/**
 * LLM Service Errors
 *
 * Custom error classes for LLM-related failures.
 */

/**
 * Base LLM error class
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Error thrown when LLM request times out
 */
export class LLMTimeoutError extends LLMError {
  constructor(message: string = 'LLM request timed out') {
    super(message, 'TIMEOUT');
    this.name = 'LLMTimeoutError';
  }
}

/**
 * Error thrown when LLM response validation fails
 */
export class LLMValidationError extends LLMError {
  constructor(message: string, public validationErrors: string[]) {
    super(message, 'VALIDATION_ERROR', { validationErrors });
    this.name = 'LLMValidationError';
  }
}

/**
 * Error thrown when LLM API returns an error
 */
export class LLMApiError extends LLMError {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: unknown,
  ) {
    super(message, 'API_ERROR', { statusCode, responseBody });
    this.name = 'LLMApiError';
  }
}

/**
 * Error thrown when LLM response cannot be parsed as JSON
 */
export class LLMParseError extends LLMError {
  constructor(message: string, public rawContent: string) {
    super(message, 'PARSE_ERROR', { rawContent });
    this.name = 'LLMParseError';
  }
}

/**
 * Error thrown when all retry attempts are exhausted
 */
export class LLMRetryExhaustedError extends LLMError {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error,
  ) {
    super(message, 'RETRY_EXHAUSTED', { attempts, lastError: lastError.message });
    this.name = 'LLMRetryExhaustedError';
  }
}

/**
 * Domain error for question-related issues
 */
export class DomainError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DomainError';
  }
}
