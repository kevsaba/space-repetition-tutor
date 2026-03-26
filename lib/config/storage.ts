/**
 * Application Configuration Storage
 *
 * Manages application configuration for self-hosted deployments.
 *
 * For security:
 * - LLM configuration is stored in localStorage (client-side only)
 * - Database configuration can be stored in localStorage or .env file
 * - API keys never touch the server when using client-side LLM calls
 */

export interface AppConfig {
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
  app: {
    name: string;
  };
  setupCompletedAt: string | null;
}

const CONFIG_KEY = 'spaced_repetition_config';

/**
 * Load application configuration from localStorage
 */
export function loadConfig(): AppConfig {
  if (typeof window === 'undefined') {
    // Server-side - use environment variables
    return {
      isConfigured: !!(process.env.DATABASE_URL && process.env.LLM_API_KEY),
      database: {
        url: process.env.DATABASE_URL || '',
        directUrl: process.env.DIRECT_URL || '',
      },
      llm: {
        apiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1',
        apiKey: process.env.LLM_API_KEY || '',
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
      },
      app: {
        name: process.env.APP_NAME || 'Space Repetition Tutor',
      },
      setupCompletedAt: null,
    };
  }

  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const config = JSON.parse(stored) as AppConfig;
      return config;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }

  // Default unconfigured state
  return {
    isConfigured: false,
    database: {
      url: '',
      directUrl: '',
    },
    llm: {
      apiUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
    },
    app: {
      name: 'Space Repetition Tutor',
    },
    setupCompletedAt: null,
  };
}

/**
 * Save application configuration to localStorage
 */
export function saveConfig(config: AppConfig): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot save config on server side');
  }

  config.setupCompletedAt = new Date().toISOString();
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * Clear application configuration (for testing or re-setup)
 */
export function clearConfig(): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot clear config on server side');
  }

  localStorage.removeItem(CONFIG_KEY);
}

/**
 * Update LLM configuration
 */
export function updateLLMConfig(llm: { apiUrl: string; apiKey: string; model: string }): void {
  const config = loadConfig();
  config.llm = llm;
  config.isConfigured = !!(config.database.url && config.llm.apiKey);
  saveConfig(config);
}

/**
 * Check if the app is configured
 */
export function isConfigured(): boolean {
  const config = loadConfig();
  return config.isConfigured && !!config.database.url && !!config.llm.apiKey;
}
