/**
 * LLM Config Service
 *
 * Manages per-user LLM configuration with encrypted API key storage.
 * Supports both SESSION (client-side) and DATABASE (encrypted) storage preferences.
 *
 * Storage preferences:
 * - SESSION: API key stored only in session/cookie (server never sees it in clear text)
 * - DATABASE: API key encrypted with user's password and stored in database
 */

import { prisma } from '@/lib/prisma';
import { encryptionService } from './encryption.service';
import type { StoragePreference, StrictnessLevel } from '@prisma/client';

/**
 * User LLM configuration (without exposing the actual API key)
 */
export interface UserLLMConfig {
  id: string;
  userId: string;
  apiUrl: string;
  model: string;
  storagePreference: StoragePreference;
  strictnessLevel: StrictnessLevel;
  hasApiKey: boolean; // true if API key is set (in DB or session)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for saving/updating LLM config
 */
export interface SaveLLMConfigInput {
  userId: string;
  apiUrl: string;
  apiKey?: string; // Optional - if not provided, keeps existing key
  model: string;
  storagePreference: StoragePreference;
  strictnessLevel?: StrictnessLevel;
  password?: string; // Required for DATABASE storage with apiKey
}

/**
 * Domain error for LLM config operations
 */
class LLMConfigError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'LLMConfigError';
  }
}

/**
 * Validate API URL format
 */
function validateApiUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new LLMConfigError('Invalid API URL format', 'INVALID_URL');
  }
}

/**
 * Validate model name
 */
function validateModel(model: string): void {
  if (!model || model.trim().length === 0) {
    throw new LLMConfigError('Model name cannot be empty', 'INVALID_MODEL');
  }
}

/**
 * Save user's LLM configuration.
 *
 * For DATABASE storage with apiKey:
 * - Encrypts the API key using the provided password
 * - Stores encrypted data in database
 *
 * For SESSION storage:
 * - Stores config WITHOUT API key in database
 * - API key should be stored in session/cookie by the API route
 *
 * @param input - Configuration data
 * @returns Saved configuration
 * @throws LLMConfigError if validation fails or password required but not provided
 */
export async function saveUserLLMConfig(input: SaveLLMConfigInput): Promise<UserLLMConfig> {
  const { userId, apiUrl, apiKey, model, storagePreference, strictnessLevel, password } = input;

  // Validate inputs
  validateApiUrl(apiUrl);
  validateModel(model);

  // For DATABASE storage with apiKey, password is required
  if (storagePreference === 'DATABASE' && apiKey && !password) {
    throw new LLMConfigError('Password required for DATABASE storage', 'PASSWORD_REQUIRED');
  }

  // Check if user already has a config
  const existing = await prisma.userLlmConfig.findUnique({
    where: { userId },
  });

  let apiKeyEncrypted: string | null = null;

  if (apiKey) {
    // New API key provided
    if (storagePreference === 'DATABASE') {
      // Encrypt the API key with the password
      const encrypted = encryptionService.encrypt(apiKey, password!);
      apiKeyEncrypted = encryptionService.formatForStorage(encrypted);
    }
    // For SESSION storage, we don't store the key in DB
  } else if (existing?.apiKeyEncrypted) {
    // Keep existing encrypted key if no new key provided
    apiKeyEncrypted = existing.apiKeyEncrypted;
  }

  // Use provided strictness level or keep existing
  const finalStrictnessLevel = strictnessLevel ?? existing?.strictnessLevel ?? 'DEFAULT';

  // Upsert the configuration
  const config = await prisma.userLlmConfig.upsert({
    where: { userId },
    create: {
      userId,
      apiUrl,
      apiKeyEncrypted,
      model,
      storagePreference,
      strictnessLevel: finalStrictnessLevel,
    },
    update: {
      apiUrl,
      apiKeyEncrypted,
      model,
      storagePreference,
      strictnessLevel: finalStrictnessLevel,
    },
  });

  return {
    id: config.id,
    userId: config.userId,
    apiUrl: config.apiUrl,
    model: config.model,
    storagePreference: config.storagePreference,
    strictnessLevel: config.strictnessLevel,
    hasApiKey: storagePreference === 'SESSION' ? !!apiKey : !!apiKeyEncrypted,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

/**
 * Get user's LLM configuration without exposing the actual API key.
 *
 * @param userId - User ID
 * @returns User's LLM config or null if not configured
 */
export async function getUserLLMConfig(userId: string): Promise<UserLLMConfig | null> {
  const config = await prisma.userLlmConfig.findUnique({
    where: { userId },
  });

  if (!config) {
    return null;
  }

  return {
    id: config.id,
    userId: config.userId,
    apiUrl: config.apiUrl,
    model: config.model,
    storagePreference: config.storagePreference,
    strictnessLevel: config.strictnessLevel,
    hasApiKey: !!config.apiKeyEncrypted, // For SESSION, key is in cookie not DB
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

/**
 * Decrypt user's stored API key using their password.
 *
 * @param userId - User ID
 * @param password - User's password for decryption
 * @returns Decrypted API key
 * @throws LLMConfigError if user not found, no key stored, or password is wrong
 */
export async function decryptApiKey(userId: string, password: string): Promise<string> {
  const config = await prisma.userLlmConfig.findUnique({
    where: { userId },
  });

  if (!config) {
    throw new LLMConfigError('User LLM config not found', 'NOT_FOUND');
  }

  if (!config.apiKeyEncrypted) {
    throw new LLMConfigError('No API key stored for this user', 'NO_KEY');
  }

  try {
    const encrypted = encryptionService.parseFromStorage(config.apiKeyEncrypted);
    return encryptionService.decrypt(encrypted, password);
  } catch (error) {
    throw new LLMConfigError('Failed to decrypt API key. Invalid password.', 'DECRYPTION_FAILED');
  }
}

/**
 * Re-encrypt API key when user changes their password.
 *
 * @param userId - User ID
 * @param oldPassword - Current password for decryption
 * @param newPassword - New password for encryption
 * @throws LLMConfigError if decryption fails
 */
export async function reencryptApiKey(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const config = await prisma.userLlmConfig.findUnique({
    where: { userId },
  });

  if (!config || !config.apiKeyEncrypted) {
    // No encrypted key to re-encrypt, nothing to do
    return;
  }

  try {
    // Decrypt with old password
    const encrypted = encryptionService.parseFromStorage(config.apiKeyEncrypted);
    const apiKey = encryptionService.decrypt(encrypted, oldPassword);

    // Re-encrypt with new password
    const newEncrypted = encryptionService.encrypt(apiKey, newPassword);

    // Update database
    await prisma.userLlmConfig.update({
      where: { userId },
      data: {
        apiKeyEncrypted: encryptionService.formatForStorage(newEncrypted),
      },
    });
  } catch (error) {
    throw new LLMConfigError(
      'Failed to re-encrypt API key. Old password may be incorrect.',
      'REENCRYPTION_FAILED'
    );
  }
}

/**
 * Delete user's LLM configuration (including encrypted API key).
 *
 * @param userId - User ID
 */
export async function deleteUserLLMConfig(userId: string): Promise<void> {
  await prisma.userLlmConfig.delete({
    where: { userId },
  });
}

/**
 * Check if user has an encrypted API key stored.
 *
 * @param userId - User ID
 * @returns true if user has encrypted API key in database
 */
export async function hasEncryptedApiKey(userId: string): Promise<boolean> {
  const config = await prisma.userLlmConfig.findUnique({
    where: { userId },
    select: { apiKeyEncrypted: true },
  });

  return !!config?.apiKeyEncrypted;
}

/**
 * LLMConfigService interface for dependency injection
 */
export const LLMConfigService = {
  saveUserLLMConfig,
  getUserLLMConfig,
  decryptApiKey,
  reencryptApiKey,
  deleteUserLLMConfig,
  hasEncryptedApiKey,
} as const;

export type LLMConfigService = typeof LLMConfigService;
