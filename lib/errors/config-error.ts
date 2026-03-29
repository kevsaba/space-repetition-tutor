/**
 * Configuration Error
 *
 * Thrown when the application is not properly configured.
 * This is different from a typical application error - it indicates
 * that setup needs to be completed before the requested operation can proceed.
 */

export class ConfigError extends Error {
  constructor(
    message: string,
    public code: string,
    public setupUrl: string = '/setup'
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Standard error for when the app is not configured
 */
export const NOT_CONFIGURED_ERROR = new ConfigError(
  'Application is not configured. Please complete setup first.',
  'APP_NOT_CONFIGURED',
  '/setup'
);

/**
 * Error code for when database is not configured
 */
export const DATABASE_NOT_CONFIGURED_ERROR = new ConfigError(
  'Database is not configured. Please complete setup first.',
  'DATABASE_NOT_CONFIGURED',
  '/setup'
);

/**
 * Error code for when LLM is not configured
 */
export const LLM_NOT_CONFIGURED_ERROR = new ConfigError(
  'LLM provider is not configured. Please complete setup first.',
  'LLM_NOT_CONFIGURED',
  '/setup'
);
