/**
 * Environment Configuration
 *
 * Validates and exports all environment variables required for the application to run.
 * Throws clear errors if required variables are missing or invalid.
 *
 * Required Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - DIRECT_URL: Direct database connection for migrations
 * - LLM_API_KEY: API key for LLM provider
 * - LLM_API_URL: API endpoint URL for LLM provider
 * - LLM_MODEL: Model name to use for LLM requests
 */

/**
 * Validation error for environment variables
 */
export class EnvValidationError extends Error {
  constructor(public variable: string, public message: string) {
    super(`Environment variable "${variable}" ${message}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Get environment variable or throw error
 */
function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new EnvValidationError(
      key,
      `is required. Please set ${key} in your environment or .env file.`
    );
  }
  return value || '';
}

/**
 * Validate URL format
 */
function validateUrl(key: string, value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new EnvValidationError(
      key,
      `must be a valid URL. Received: "${value}"`
    );
  }
}

/**
 * Validate and export all environment configuration
 */
export const env = {
  // Database Configuration
  database: {
    url: getEnvVar('DATABASE_URL'),
    directUrl: getEnvVar('DIRECT_URL'),
  },

  // LLM Configuration
  llm: {
    apiKey: getEnvVar('LLM_API_KEY'),
    apiUrl: getEnvVar('LLM_API_URL', false) || 'https://api.openai.com/v1',
    model: getEnvVar('LLM_MODEL', false) || 'gpt-4o-mini',
  },

  // App Configuration
  app: {
    nodeEnv: getEnvVar('NODE_ENV', false) || 'development',
    port: parseInt(getEnvVar('PORT', false) || '3000', 10),
  },

  // Optional: Supabase (if using Supabase Auth)
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', false),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', false),
  },
};

/**
 * Validate all environment variables on import
 * This runs when the module is first loaded
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required database variables
  if (!env.database.url) {
    errors.push('DATABASE_URL is required. Format: postgresql://user:password@host:port/database');
  }
  if (!env.database.directUrl) {
    errors.push('DIRECT_URL is required for database migrations.');
  }

  // Validate required LLM variables
  if (!env.llm.apiKey) {
    errors.push('LLM_API_KEY is required. Get one from https://platform.openai.com/api-keys');
  }

  // Validate URL formats
  try {
    if (env.database.url) {
      validateUrl('DATABASE_URL', env.database.url);
    }
    if (env.llm.apiUrl) {
      validateUrl('LLM_API_URL', env.llm.apiUrl);
    }
  } catch (err) {
    if (err instanceof EnvValidationError) {
      errors.push(err.message);
    }
  }

  // Validate port
  if (isNaN(env.app.port) || env.app.port < 1 || env.app.port > 65535) {
    errors.push('PORT must be a valid port number (1-65535).');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate on import in production, but allow development to proceed with warnings
 */
if (env.app.nodeEnv === 'production') {
  const validation = validateEnv();
  if (!validation.valid) {
    console.error('❌ Environment validation failed:');
    validation.errors.forEach((err) => console.error(`   - ${err}`));
    throw new Error('Invalid environment configuration. See errors above.');
  }
} else {
  // In development, just warn
  const validation = validateEnv();
  if (!validation.valid) {
    console.warn('⚠️  Environment configuration warnings:');
    validation.errors.forEach((err) => console.warn(`   - ${err}`));
  }
}
