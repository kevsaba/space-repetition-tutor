/**
 * POST /api/settings/password
 *
 * Update user password.
 * Requires authentication and current password verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { hasEncryptedApiKey, decryptApiKey } from '@/lib/services/llm-config.service';
import { prisma } from '@/lib/prisma';
import { encryptionService } from '@/lib/services/encryption.service';
import { z } from 'zod';
import { cookies } from 'next/headers';

// Validation schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

/**
 * POST - Update password
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const payload = AuthService.verifyToken(token);

    // Validate request body
    const body = await request.json();
    const validatedData = passwordSchema.parse(body);

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Verify current password
    const isValid = await AuthService.verifyPassword(
      validatedData.currentPassword,
      user.password
    );

    if (!isValid) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } },
        { status: 401 }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await AuthService.verifyPassword(
      validatedData.newPassword,
      user.password
    );

    if (isSamePassword) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'New password must be different from current password' } },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await AuthService.hashPassword(validatedData.newPassword);

    // Check if user has encrypted LLM config
    const hasEncryptedKey = await hasEncryptedApiKey(user.id);
    let newDecryptedKey: string | null = null;

    if (hasEncryptedKey) {
      try {
        // Decrypt the API key with old password and re-encrypt with new password
        const apiKey = await decryptApiKey(user.id, validatedData.currentPassword);

        // Re-encrypt with new password
        const encrypted = encryptionService.encrypt(apiKey, validatedData.newPassword);

        // Update encrypted API key in database
        await prisma.userLlmConfig.update({
          where: { userId: user.id },
          data: {
            apiKeyEncrypted: encryptionService.formatForStorage(encrypted),
          },
        });

        newDecryptedKey = apiKey;
      } catch (error) {
        // If re-encryption fails, log but allow password change to continue
        // User will need to re-enter their API key
        console.error('Failed to re-encrypt LLM config on password change:', error);
      }
    }

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Update the temp key cookie if we successfully re-encrypted
    if (newDecryptedKey) {
      cookieStore.set('llm_temp_key', newDecryptedKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid input', details: error.issues } },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    console.error('Update password error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
