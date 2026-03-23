/**
 * POST /api/auth/register
 *
 * Register a new user account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { z } from 'zod';

// Validation schema
const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9]+$/),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = registerSchema.parse(body);

    // Register user
    const user = await UserService.registerUser(
      validatedData.username,
      validatedData.password,
    );

    // Return user (without password)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
        },
      },
      { status: 201 },
    );
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
      if (error.message === 'Username already exists') {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: error.message } },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: error.message } },
        { status: 400 },
      );
    }

    // Handle unknown errors
    console.error('Register error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
