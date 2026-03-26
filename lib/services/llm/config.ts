/**
 * LLM Service Configuration
 *
 * Configuration management for LLM service.
 * Priority order:
 * 1. User-specific config (from session/database with decrypted temp cookie)
 * 2. Global config (from runtime setup wizard)
 * 3. Environment variables
 */

import {
  getLLMApiUrl,
  getLLMApiKey,
  getLLMModel,
} from '@/lib/config/runtime';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/services/auth.service';

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

/**
 * User LLM configuration from database
 */
interface UserLLMDbConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

/**
 * Get user-specific LLM configuration.
 *
 * Priority order:
 * 1. Session storage (llm_temp_key cookie)
 * 2. Database storage (decrypted via temp cookie + password verification)
 * 3. Falls back to null (caller should use global config)
 *
 * @returns User LLM config or null if not configured
 */
export async function getUserLLMConfig(): Promise<UserLLMDbConfig | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const payload = AuthService.verifyToken(token);

    // Get user's LLM config from database
    const userConfig = await prisma.userLlmConfig.findUnique({
      where: { userId: payload.userId },
    });

    if (!userConfig) {
      return null;
    }

    // Check storage preference
    if (userConfig.storagePreference === 'SESSION') {
      // For SESSION storage, API key should be in temp cookie
      const tempKey = cookieStore.get('llm_temp_key')?.value;
      if (!tempKey) {
        return null;
      }
      return {
        apiUrl: userConfig.apiUrl,
        apiKey: tempKey,
        model: userConfig.model,
      };
    } else {
      // For DATABASE storage, API key was decrypted on login and stored in temp cookie
      const tempKey = cookieStore.get('llm_temp_key')?.value;
      if (!tempKey) {
        return null;
      }
      return {
        apiUrl: userConfig.apiUrl,
        apiKey: tempKey,
        model: userConfig.model,
      };
    }
  } catch (error) {
    // If auth fails or any error, fall back to null
    return null;
  }
}

/**
 * Get LLM configuration with user-specific priority.
 *
 * SECURITY: Each user MUST have their own LLM config.
 * This function throws an error if user has no config configured.
 * We DO NOT fall back to global config to prevent credential leakage.
 *
 * @returns LLM configuration
 * @throws Error if user has not configured their LLM settings
 */
export async function getLLMConfigWithUserFallback(): Promise<LLMConfig> {
  // Try user config first
  const userConfig = await getUserLLMConfig();
  if (userConfig) {
    let url = userConfig.apiUrl;
    // Ensure URL includes /chat/completions path
    if (!url.includes('/chat/completions')) {
      url = url.endsWith('/') ? `${url}chat/completions` : `${url}/chat/completions`;
    }
    return {
      url,
      apiKey: userConfig.apiKey,
      model: userConfig.model,
      timeout: 30000,
      retry: DEFAULT_RETRY_CONFIG,
    };
  }

  // SECURITY: Do NOT fall back to global config
  // Each user must have their own config to prevent credential leakage
  throw new Error(
    'LLM configuration not found. Please configure your LLM settings in Settings.'
  );
}
