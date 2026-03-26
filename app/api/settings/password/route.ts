/**
 * POST /api/settings/password
 *
 * Update user password.
 * Requires authentication and current password verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { UserService } from '@/lib/services/user.service';
import { prisma } from '@/lib/prisma';
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

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

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
