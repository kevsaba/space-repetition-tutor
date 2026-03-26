import { randomBytes } from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { encryptionService, EncryptedData } from '../encryption.service';

describe('EncryptionService', () => {
  describe('encrypt and decrypt', () => {
    it('should successfully encrypt and decrypt data', () => {
      const plaintext = 'This is a secret API key: sk-1234567890';
      const password = 'user-password-123';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const decrypted = encryptionService.decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext with different salts', () => {
      const plaintext = 'This is a secret API key: sk-1234567890';
      const password = 'user-password-123';

      const encrypted1 = encryptionService.encrypt(plaintext, password);
      const encrypted2 = encryptionService.encrypt(plaintext, password);

      // Different salts should produce different ciphertexts
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.tag).not.toBe(encrypted2.tag);

      // But both should decrypt to the same plaintext
      expect(encryptionService.decrypt(encrypted1, password)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2, password)).toBe(plaintext);
    });

    it('should fail to decrypt with wrong password', () => {
      const plaintext = 'This is a secret API key: sk-1234567890';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';

      const encrypted = encryptionService.encrypt(plaintext, correctPassword);

      expect(() => {
        encryptionService.decrypt(encrypted, wrongPassword);
      }).toThrow('Decryption failed');
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const password = 'user-password-123';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const decrypted = encryptionService.decrypt(encrypted, password);

      expect(decrypted).toBe('');
    });

    it('should handle special characters and unicode', () => {
      const plaintext = 'sk-🔑-test-key-with-特殊-characters-中文-emoji-🚀';
      const password = 'p@ssw0rd!with-special-ñoños';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const decrypted = encryptionService.decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings (like JWT tokens)', () => {
      // Simulate a long JWT token
      const plaintext =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const password = 'secure-password-for-jwt';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const decrypted = encryptionService.decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('deriveKey', () => {
    it('should derive the same key for the same password and salt', () => {
      const password = 'test-password';
      const salt = randomBytes(32).toString('hex');

      const key1 = encryptionService.deriveKey(password, salt);
      const key2 = encryptionService.deriveKey(password, salt);

      expect(key1.equals(key2)).toBe(true);
    });

    it('should derive different keys for different passwords', () => {
      const salt = randomBytes(32).toString('hex');

      const key1 = encryptionService.deriveKey('password1', salt);
      const key2 = encryptionService.deriveKey('password2', salt);

      expect(key1.equals(key2)).toBe(false);
    });

    it('should derive different keys for different salts', () => {
      const password = 'test-password';
      const salt1 = randomBytes(32).toString('hex');
      const salt2 = randomBytes(32).toString('hex');

      const key1 = encryptionService.deriveKey(password, salt1);
      const key2 = encryptionService.deriveKey(password, salt2);

      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('formatForStorage and parseFromStorage', () => {
    it('should successfully round-trip through JSON storage', () => {
      const plaintext = 'sk-test-api-key-12345';
      const password = 'storage-test-password';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const stored = encryptionService.formatForStorage(encrypted);
      const parsed = encryptionService.parseFromStorage(stored);
      const decrypted = encryptionService.decrypt(parsed, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce valid JSON string', () => {
      const plaintext = 'test-data';
      const password = 'test-password';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const stored = encryptionService.formatForStorage(encrypted);

      expect(typeof stored).toBe('string');

      const parsed = JSON.parse(stored);
      expect(parsed).toHaveProperty('salt');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('tag');
      expect(parsed).toHaveProperty('data');
    });

    it('should throw error for invalid JSON structure', () => {
      expect(() => {
        encryptionService.parseFromStorage('not-valid-json');
      }).toThrow();
    });

    it('should throw error for incomplete data', () => {
      const incompleteData = JSON.stringify({ salt: 'abc', iv: 'def' }); // missing tag and data
      expect(() => {
        encryptionService.parseFromStorage(incompleteData);
      }).toThrow('Invalid encrypted data structure');
    });
  });

  describe('convenience methods', () => {
    it('should encryptAndFormat in one step', () => {
      const plaintext = 'sk-api-key-for-convenience-test';
      const password = 'convenience-password';

      const stored = encryptionService.encryptAndFormat(plaintext, password);

      expect(typeof stored).toBe('string');
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveProperty('salt');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('tag');
      expect(parsed).toHaveProperty('data');
    });

    it('should parseAndDecrypt in one step', () => {
      const plaintext = 'sk-api-key-for-convenience-test';
      const password = 'convenience-password';

      const stored = encryptionService.encryptAndFormat(plaintext, password);
      const decrypted = encryptionService.parseAndDecrypt(stored, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should round-trip using convenience methods', () => {
      const plaintext = 'sk-full-round-trip-test-key';
      const password = 'round-trip-password';

      const stored = encryptionService.encryptAndFormat(plaintext, password);
      const decrypted = encryptionService.parseAndDecrypt(stored, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('security properties', () => {
    it('should use 32-byte salt', () => {
      const plaintext = 'test';
      const password = 'test';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const saltBuffer = Buffer.from(encrypted.salt, 'hex');

      expect(saltBuffer.length).toBe(64); // 64 hex chars = 32 bytes
    });

    it('should use 16-byte IV', () => {
      const plaintext = 'test';
      const password = 'test';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const ivBuffer = Buffer.from(encrypted.iv, 'hex');

      expect(ivBuffer.length).toBe(16); // 16 bytes
    });

    it('should use 16-byte auth tag', () => {
      const plaintext = 'test';
      const password = 'test';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const tagBuffer = Buffer.from(encrypted.tag, 'hex');

      expect(tagBuffer.length).toBe(16); // 16 bytes
    });

    it('should detect tampered data', () => {
      const plaintext = 'test-data';
      const password = 'test-password';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const stored = encryptionService.formatForStorage(encrypted);

      // Tamper with the stored data
      const tamperedStored = stored.replace('"data":', '"DATA":');

      expect(() => {
        encryptionService.parseAndDecrypt(tamperedStored, password);
      }).toThrow();
    });

    it('should detect corrupted ciphertext', () => {
      const plaintext = 'test-data';
      const password = 'test-password';

      const encrypted = encryptionService.encrypt(plaintext, password);

      // Corrupt the ciphertext
      const corruptedEncrypted = {
        ...encrypted,
        data: encrypted.data.slice(0, -4) + 'FFFF',
      };

      expect(() => {
        encryptionService.decrypt(corruptedEncrypted, password);
      }).toThrow('Decryption failed');
    });
  });
});
