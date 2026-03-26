/**
 * UserService - User Management
 *
 * Handles user CRUD operations.
 */

import { prisma } from '../prisma';
import { AuthService } from './auth.service';
import type { User } from '@prisma/client';

export type { User };

/**
 * Register a new user.
 *
 * @param username - Username (3-30 characters, alphanumeric)
 * @param password - Password (min 8 characters)
 * @returns Created user
 * @throws Error if validation fails or username exists
 */
export async function registerUser(username: string, password: string): Promise<User> {
  // Validate username
  if (username.length < 3 || username.length > 30) {
    throw new Error('Username must be between 3 and 30 characters');
  }
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    throw new Error('Username must contain only letters and numbers');
  }

  // Validate password
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check if username exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Hash password
  const hashedPassword = await AuthService.hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
    },
  });

  return user;
}

/**
 * Login a user.
 *
 * @param username - Username
 * @param password - Password
 * @returns User and token
 * @throws Error if credentials are invalid
 */
export async function loginUser(
  username: string,
  password: string,
): Promise<{ user: User; token: string }> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isValid = await AuthService.verifyPassword(password, user.password);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Generate token
  const token = AuthService.generateToken(user);

  return { user, token };
}

/**
 * Get user by ID.
 *
 * @param userId - User ID
 * @returns User or null
 */
export async function getUserById(userId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * Update user password.
 *
 * @param userId - User ID
 * @param newPassword - New hashed password
 * @returns Updated user
 * @throws Error if user not found
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { password: newPassword },
  });
}

/**
 * UserService interface for dependency injection
 */
export const UserService = {
  registerUser,
  loginUser,
  getUserById,
  updateUserPassword,
} as const;

export type UserService = typeof UserService;
