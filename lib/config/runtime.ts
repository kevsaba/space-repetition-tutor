/**
 * Runtime Configuration
 *
 * Loads configuration from config/runtime.json for self-hosted deployments.
 * This allows the setup wizard to configure the app without requiring
 * environment variable changes or server restarts.
 *
 * Priority order:
 * 1. Environment variables (for traditional deployments)
 * 2. Runtime config file (for setup wizard deployments)
 */

import fs from 'fs';
import path from 'path';

export interface RuntimeConfig {
  isConfigured: boolean;
  database: {
    url: string;
    directUrl: string;
  };
  llm: {
    apiUrl: string;
    apiKey: string;
    model: string;
  };
  setupCompletedAt: string | null;
}

let cachedConfig: RuntimeConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Get the runtime config path - only works in Node.js runtime
 */
function getRuntimeConfigPath(): string {
  return path.join(process.cwd(), 'config', 'runtime.json');
}

/**
 * Load runtime configuration from file - only works in Node.js runtime
 */
function loadRuntimeConfig(): RuntimeConfig | null {
  try {
    const RUNTIME_CONFIG_PATH = getRuntimeConfigPath();
    if (fs.existsSync(RUNTIME_CONFIG_PATH)) {
      const content = fs.readFileSync(RUNTIME_CONFIG_PATH, 'utf-8');
      return JSON.parse(content) as RuntimeConfig;
    }
  } catch (error) {
    console.error('Failed to load runtime config:', error);
  }
  return null;
}

/**
 * Get runtime configuration with caching
 * Returns null in edge runtime (middleware)
 */
export function getRuntimeConfig(): RuntimeConfig | null {
  // In edge/middleware context, return null
  // The middleware will use the API route to check config status
  if (typeof process !== 'object' || !process.cwd) {
    return null;
  }

  const now = Date.now();

  // Use cached value if still valid
  if (cachedConfig && (now - cacheTime) < CACHE_TTL) {
    return cachedConfig;
  }

  // Reload from file
  cachedConfig = loadRuntimeConfig();
  cacheTime = now;

  return cachedConfig;
}

/**
 * Save runtime configuration to file
 */
export function saveRuntimeConfig(config: RuntimeConfig): void {
  try {
    const RUNTIME_CONFIG_PATH = getRuntimeConfigPath();
    
    // Ensure config directory exists
    const configDir = path.dirname(RUNTIME_CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write config
    fs.writeFileSync(
      RUNTIME_CONFIG_PATH,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    // Update cache
    cachedConfig = config;
    cacheTime = Date.now();
  } catch (error) {
    console.error('Failed to save runtime config:', error);
    throw new Error('Failed to save configuration');
  }
}

/**
 * Check if app is configured via runtime config
 * Also checks environment variables as fallback
 */
export function isRuntimeConfigured(): boolean {
  // First check environment variables (traditional deployment)
  if (process.env.DATABASE_URL && process.env.LLM_API_KEY) {
    return true;
  }

  // Then check runtime config file
  const config = getRuntimeConfig();
  return config?.isConfigured === true &&
    !!config.database.url &&
    !!config.llm.apiKey;
}

/**
 * Get a config value with fallback to environment variable
 */
export function getConfigValue<T>(
  runtimeGetter: (config: RuntimeConfig) => T,
  envVar: string
): T | undefined {
  // Try environment variable first (faster, traditional approach)
  const envValue = process.env[envVar];
  if (envValue) return envValue as T;

  // Try runtime config
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig) {
    const value = runtimeGetter(runtimeConfig);
    if (value) return value;
  }

  return undefined;
}

/**
 * Get database URL from runtime config or env
 */
export function getDatabaseUrl(): string {
  // Check env first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  const value = getConfigValue(
    (c) => c.database.url,
    'DATABASE_URL'
  );
  if (!value) {
    throw new Error('DATABASE_URL not configured. Please run setup.');
  }
  return value;
}

/**
 * Get direct database URL from runtime config or env
 */
export function getDirectUrl(): string {
  // Check env first
  if (process.env.DIRECT_URL) {
    return process.env.DIRECT_URL;
  }
  
  const value = getConfigValue(
    (c) => c.database.directUrl,
    'DIRECT_URL'
  );
  if (!value) {
    throw new Error('DIRECT_URL not configured. Please run setup.');
  }
  return value;
}

/**
 * Get LLM API URL from runtime config or env
 */
export function getLLMApiUrl(): string {
  // Check env first
  if (process.env.LLM_API_URL) {
    return process.env.LLM_API_URL;
  }
  
  const value = getConfigValue(
    (c) => c.llm.apiUrl,
    'LLM_API_URL'
  );
  return value || 'https://api.openai.com/v1';
}

/**
 * Get LLM API key from runtime config or env
 */
export function getLLMApiKey(): string {
  // Check env first
  if (process.env.LLM_API_KEY) {
    return process.env.LLM_API_KEY;
  }
  
  const value = getConfigValue(
    (c) => c.llm.apiKey,
    'LLM_API_KEY'
  );
  if (!value) {
    throw new Error('LLM_API_KEY not configured. Please run setup.');
  }
  return value;
}

/**
 * Get LLM model from runtime config or env
 */
export function getLLMModel(): string {
  // Check env first
  if (process.env.LLM_MODEL) {
    return process.env.LLM_MODEL;
  }
  
  const value = getConfigValue(
    (c) => c.llm.model,
    'LLM_MODEL'
  );
  return value || 'gpt-4o-mini';
}
