import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';

// Configuration constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits (auth tag length)
const ITERATIONS = 100000;

/**
 * Encrypted data structure for storage
 */
export interface EncryptedData {
  salt: string;
  iv: string;
  tag: string;
  data: string;
}

/**
 * Encryption service using AES-256-GCM for secure API key storage
 *
 * This service provides encryption/decryption using:
 * - AES-256-GCM for authenticated encryption
 * - PBKDF2 for key derivation from user password
 * - Random salt and IV for each encryption
 */
export class EncryptionService {
  private readonly algorithm = ALGORITHM;
  private readonly keyLength = KEY_LENGTH;
  private readonly ivLength = IV_LENGTH;
  private readonly saltLength = SALT_LENGTH;
  private readonly tagLength = TAG_LENGTH;
  private readonly iterations = ITERATIONS;

  /**
   * Derives a cryptographic key from a password and salt using PBKDF2
   *
   * @param password - The user's password or encryption key
   * @param salt - The salt as a hex string
   * @returns A Buffer containing the derived key
   */
  deriveKey(password: string, salt: string): Buffer {
    const saltBuffer = Buffer.from(salt, 'hex');
    return pbkdf2Sync(password, saltBuffer, this.iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypts data using AES-256-GCM
   *
   * @param data - The plaintext data to encrypt
   * @param password - The password to derive the encryption key from
   * @returns An EncryptedData object containing salt, iv, tag, and encrypted data
   */
  encrypt(data: string, password: string): EncryptedData {
    // Generate a random salt for key derivation
    const salt = randomBytes(this.saltLength);
    // Generate a random IV for the cipher
    const iv = randomBytes(this.ivLength);

    // Derive the key from password and salt
    const key = this.deriveKey(password, salt.toString('hex'));

    // Create cipher with AES-256-GCM
    const cipher = createCipheriv(this.algorithm, key, iv);

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted.toString('hex'),
    };
  }

  /**
   * Decrypts data that was encrypted with the encrypt method
   *
   * @param encrypted - The EncryptedData object to decrypt
   * @param password - The password used for encryption
   * @returns The decrypted plaintext
   * @throws Error if decryption fails (wrong password or corrupted data)
   */
  decrypt(encrypted: EncryptedData, password: string): string {
    // Derive the key from password and stored salt
    const key = this.deriveKey(password, encrypted.salt);

    // Convert stored hex strings back to Buffers
    const iv = Buffer.from(encrypted.iv, 'hex');
    const tag = Buffer.from(encrypted.tag, 'hex');
    const encryptedData = Buffer.from(encrypted.data, 'hex');

    // Create decipher
    const decipher = createDecipheriv(this.algorithm, key, iv);

    // Set the authentication tag (required for GCM)
    decipher.setAuthTag(tag);

    try {
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed: Invalid password or corrupted data');
    }
  }

  /**
   * Formats EncryptedData for JSON storage
   *
   * @param encrypted - The EncryptedData object
   * @returns JSON string suitable for database storage
   */
  formatForStorage(encrypted: EncryptedData): string {
    return JSON.stringify(encrypted);
  }

  /**
   * Parses stored JSON back to EncryptedData
   *
   * @param stored - The JSON string from storage
   * @returns Parsed EncryptedData object
   * @throws Error if JSON is invalid
   */
  parseFromStorage(stored: string): EncryptedData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      throw new Error('Failed to parse encrypted data from storage');
    }

    // Validate the structure
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('salt' in parsed) ||
      !('iv' in parsed) ||
      !('tag' in parsed) ||
      !('data' in parsed)
    ) {
      throw new Error('Invalid encrypted data structure');
    }

    return parsed as EncryptedData;
  }

  /**
   * Convenience method to encrypt and format for storage in one step
   *
   * @param data - The plaintext data to encrypt
   * @param password - The password to derive the encryption key from
   * @returns JSON string ready for database storage
   */
  encryptAndFormat(data: string, password: string): string {
    const encrypted = this.encrypt(data, password);
    return this.formatForStorage(encrypted);
  }

  /**
   * Convenience method to parse from storage and decrypt in one step
   *
   * @param stored - The JSON string from storage
   * @param password - The password used for encryption
   * @returns The decrypted plaintext
   */
  parseAndDecrypt(stored: string, password: string): string {
    const encrypted = this.parseFromStorage(stored);
    return this.decrypt(encrypted, password);
  }
}

// Export a singleton instance
export const encryptionService = new EncryptionService();
