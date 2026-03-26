/**
 * LLM Service Configuration
 *
 * Configuration management for LLM service.
 * Uses runtime config (from setup wizard) or environment variables.
 */

import {
  getLLMApiUrl,
  getLLMApiKey,
  getLLMModel,
} from '@/lib/config/runtime';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types';

/**
 * LLM configuration from runtime config or environment variables
 */
interface LLMConfig {
  url: string;
  apiKey: string;
  model: string;
  timeout: number;
  retry: RetryConfig;
}

/**
 * Get LLM configuration from runtime config or environment variables
 *
 * Supports OpenAI-compatible APIs including:
 * - OpenAI (https://api.openai.com/v1)
 * - LiteLLM proxies
 * - Azure OpenAI
 * - Any OpenAI-compatible provider
 */
export function getLLMConfig(): LLMConfig {
  let url = getLLMApiUrl();
  const apiKey = getLLMApiKey();
  const model = getLLMModel();

  if (!apiKey) {
    throw new Error('LLM_API_KEY not configured. Please run setup.');
  }

  // Ensure URL includes /chat/completions path for OpenAI-compatible APIs
  if (!url.includes('/chat/completions')) {
    // Remove trailing slash if present, then append /chat/completions
    url = url.endsWith('/') ? `${url}chat/completions` : `${url}/chat/completions`;
  }

  return {
    url,
    apiKey,
    model,
    timeout: 30000,
    retry: DEFAULT_RETRY_CONFIG,
  };
}

/**
 * Validate LLM configuration
 */
export function validateLLMConfig(config: LLMConfig): void {
  if (!config.url.startsWith('https://') && !config.url.startsWith('http://')) {
    throw new Error('LLM_API_URL must be a valid URL');
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

// Export a function to get fresh config (for runtime config changes)
export function getFreshLLMConfig(): LLMConfig {
  return getLLMConfig();
}
