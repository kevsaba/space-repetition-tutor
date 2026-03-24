/**
 * LLM Service Configuration
 *
 * Configuration management for LLM service.
 */

import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types';

/**
 * LLM configuration from environment variables
 */
interface LLMConfig {
  url: string;
  apiKey: string;
  model: string;
  timeout: number;
  retry: RetryConfig;
}

/**
 * Get LLM configuration from environment variables
 */
export function getLLMConfig(): LLMConfig {
  let url = process.env.LLM_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!url) {
    throw new Error('LLM_URL environment variable is not set');
  }
  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is not set');
  }
  if (!model) {
    throw new Error('LLM_MODEL environment variable is not set');
  }

  // Ensure URL includes /chat/completions path for OpenAI-compatible APIs
  // LLM_URL should be the base URL (e.g., https://api.openai.com/v1)
  // We append /chat/completions if not already present
  if (!url.includes('/chat/completions')) {
    // Remove trailing slash if present, then append /chat/completions
    url = url.endsWith('/') ? `${url}chat/completions` : `${url}/chat/completions`;
  }

  return {
    url,
    apiKey,
    model,
    timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
    retry: DEFAULT_RETRY_CONFIG,
  };
}

/**
 * Validate LLM configuration
 */
export function validateLLMConfig(config: LLMConfig): void {
  if (!config.url.startsWith('https://') && !config.url.startsWith('http://')) {
    throw new Error('LLM_URL must be a valid URL');
  }
  if (config.apiKey.length < 10) {
    throw new Error('LLM_API_KEY appears to be invalid');
  }
  if (config.model.length === 0) {
    throw new Error('LLM_MODEL must not be empty');
  }
  if (config.timeout < 1000) {
    throw new Error('LLM_TIMEOUT must be at least 1000ms');
  }
}

// Export singleton configuration
export const llmConfig = getLLMConfig();
validateLLMConfig(llmConfig);
