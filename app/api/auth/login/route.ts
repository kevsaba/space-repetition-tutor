/**
 * POST /api/auth/login
 *
 * Login with username and password.
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { AuthService } from '@/lib/services/auth.service';
import { z } from 'zod';
import { cookies } from 'next/headers';

// Validation schema
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = loginSchema.parse(body);

    // Login user
    const { user, token } = await UserService.loginUser(
      validatedData.username,
      validatedData.password,
    );

    // Set auth token in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Return user
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid input', details: error.issues } },
        { status: 400 },
      );
    }

    // Handle known domain errors
    if (error instanceof Error) {
      if (error.message === 'Invalid credentials') {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: error.message } },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: error.message } },
        { status: 400 },
      );
    }

    // Handle unknown errors
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
