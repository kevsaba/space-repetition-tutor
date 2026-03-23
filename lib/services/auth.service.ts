/**
 * AuthService - Authentication Service
 *
 * Simple username/password authentication for v1.
 * Designed for easy replacement (OAuth, magic link, etc.) in future versions.
 *
 * Security:
 * - Passwords hashed with bcrypt (10 salt rounds)
 * - JWT tokens stored in httpOnly cookies
 * - Never store plaintext passwords
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Types
export interface User {
  id: string;
  username: string;
  createdAt: Date;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
}

// Configuration
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Hash a password using bcrypt.
 *
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash.
 *
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user.
 *
 * @param user - User object
 * @returns JWT token
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token.
 *
 * @param token - JWT token to verify
 * @returns Decoded payload
 * @throws Error if token is invalid
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * AuthService interface for dependency injection
 */
export const AuthService = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
} as const;

export type AuthService = typeof AuthService;
