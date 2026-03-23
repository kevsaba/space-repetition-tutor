/**
 * Authentication Middleware Helper
 *
 * Helper function to verify authentication and extract user ID.
 */

import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { cookies } from 'next/headers';

export interface AuthResult {
  userId: string;
  username: string;
}

/**
 * Verify authentication and extract user ID.
 *
 * @throws Error if not authenticated
 */
export async function authenticate(request: NextRequest): Promise<AuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const payload = AuthService.verifyToken(token);
    return {
      userId: payload.userId,
      username: payload.username,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}
