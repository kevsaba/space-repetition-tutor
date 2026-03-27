/**
 * Unit tests for LLMConfigService with strictness levels
 *
 * Tests LLM configuration with strictness levels:
 * - Saving config with different strictness levels
 * - Retrieving config with strictness level
 * - Default strictness level behavior
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import {
  LLMConfigService,
  saveUserLLMConfig,
  getUserLLMConfig,
  deleteUserLLMConfig,
} from '../llm-config.service';
import type { StrictnessLevel, StoragePreference } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userLlmConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('LLMConfigService - Strictness Levels', () => {
  const mockUserId = 'test-user-123';
  const mockConfig = {
    id: 'config-123',
    userId: mockUserId,
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    storagePreference: 'SESSION' as StoragePreference,
    strictnessLevel: 'DEFAULT' as StrictnessLevel,
    hasApiKey: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('saveUserLLMConfig with strictness levels', () => {
    it('should save config with DEFAULT strictness', async () => {
      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
        strictnessLevel: 'DEFAULT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...mockConfig,
        strictnessLevel: 'DEFAULT',
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('DEFAULT');
      expect(prisma.userLlmConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ strictnessLevel: 'DEFAULT' }),
          update: expect.objectContaining({ strictnessLevel: 'DEFAULT' }),
        })
      );
    });

    it('should save config with STRICT strictness', async () => {
      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
        strictnessLevel: 'STRICT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...mockConfig,
        strictnessLevel: 'STRICT',
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('STRICT');
    });

    it('should save config with LENIENT strictness', async () => {
      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
        strictnessLevel: 'LENIENT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...mockConfig,
        strictnessLevel: 'LENIENT',
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('LENIENT');
    });

    it('should default to DEFAULT when strictness not provided', async () => {
      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...mockConfig,
        strictnessLevel: 'DEFAULT',
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('DEFAULT');
    });

    it('should preserve existing strictness when updating without new value', async () => {
      const existingConfig = {
        ...mockConfig,
        strictnessLevel: 'STRICT' as StrictnessLevel,
      };

      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-new-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
        // No strictnessLevel provided
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(existingConfig);
      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...existingConfig,
        hasApiKey: true,
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('STRICT');
    });

    it('should override existing strictness when new value is provided', async () => {
      const existingConfig = {
        ...mockConfig,
        strictnessLevel: 'STRICT' as StrictnessLevel,
      };

      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-new-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
        strictnessLevel: 'LENIENT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(existingConfig);
      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...existingConfig,
        strictnessLevel: 'LENIENT',
        hasApiKey: true,
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('LENIENT');
    });
  });

  describe('getUserLLMConfig with strictness levels', () => {
    it('should return config with DEFAULT strictness', async () => {
      const configWithDefault = {
        ...mockConfig,
        strictnessLevel: 'DEFAULT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(configWithDefault);

      const result = await getUserLLMConfig(mockUserId);

      expect(result).not.toBeNull();
      expect(result?.strictnessLevel).toBe('DEFAULT');
    });

    it('should return config with STRICT strictness', async () => {
      const configWithStrict = {
        ...mockConfig,
        strictnessLevel: 'STRICT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(configWithStrict);

      const result = await getUserLLMConfig(mockUserId);

      expect(result).not.toBeNull();
      expect(result?.strictnessLevel).toBe('STRICT');
    });

    it('should return config with LENIENT strictness', async () => {
      const configWithLenient = {
        ...mockConfig,
        strictnessLevel: 'LENIENT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(configWithLenient);

      const result = await getUserLLMConfig(mockUserId);

      expect(result).not.toBeNull();
      expect(result?.strictnessLevel).toBe('LENIENT');
    });

    it('should return null when no config exists', async () => {
      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUserLLMConfig(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('deleteUserLLMConfig', () => {
    it('should delete user config', async () => {
      (prisma.userLlmConfig.delete as jest.Mock).mockResolvedValue(mockConfig);

      await deleteUserLLMConfig(mockUserId);

      expect(prisma.userLlmConfig.delete).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });
  });

  describe('LLMConfigService interface', () => {
    it('should export all service methods', () => {
      expect(LLMConfigService.saveUserLLMConfig).toBeDefined();
      expect(LLMConfigService.getUserLLMConfig).toBeDefined();
      expect(LLMConfigService.deleteUserLLMConfig).toBeDefined();
    });
  });

  describe('Strictness level transitions', () => {
    it('should allow transitioning from DEFAULT to STRICT', async () => {
      const existingConfig = {
        ...mockConfig,
        strictnessLevel: 'DEFAULT' as StrictnessLevel,
      };

      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-new-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
        strictnessLevel: 'STRICT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(existingConfig);
      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...existingConfig,
        strictnessLevel: 'STRICT',
        hasApiKey: true,
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('STRICT');
    });

    it('should allow transitioning from STRICT to LENIENT', async () => {
      const existingConfig = {
        ...mockConfig,
        strictnessLevel: 'STRICT' as StrictnessLevel,
      };

      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-new-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
        strictnessLevel: 'LENIENT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(existingConfig);
      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...existingConfig,
        strictnessLevel: 'LENIENT',
        hasApiKey: true,
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('LENIENT');
    });

    it('should allow transitioning from LENIENT to DEFAULT', async () => {
      const existingConfig = {
        ...mockConfig,
        strictnessLevel: 'LENIENT' as StrictnessLevel,
      };

      const input = {
        userId: mockUserId,
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-new-key',
        model: 'gpt-4o-mini',
        storagePreference: 'SESSION' as StoragePreference,
        strictnessLevel: 'DEFAULT' as StrictnessLevel,
      };

      (prisma.userLlmConfig.findUnique as jest.Mock).mockResolvedValue(existingConfig);
      (prisma.userLlmConfig.upsert as jest.Mock).mockResolvedValue({
        ...existingConfig,
        strictnessLevel: 'DEFAULT',
        hasApiKey: true,
      });

      const result = await saveUserLLMConfig(input);

      expect(result.strictnessLevel).toBe('DEFAULT');
    });
  });
});
