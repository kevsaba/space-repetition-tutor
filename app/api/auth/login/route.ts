/**
 * POST /api/auth/login
 *
 * Login with username and password.
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { hasEncryptedApiKey, decryptApiKey } from '@/lib/services/llm-config.service';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { withConfigCheck } from '@/lib/middleware/api-config-check';
import { ConfigError } from '@/lib/errors/config-error';
import { isTableNotFoundError, isConnectionError } from '@/lib/services/database-health.service';

// Validation schema
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

/**
 * Login handler - wrapped with configuration check
 *
 * The withConfigCheck wrapper ensures DATABASE_URL is configured
 * before this handler executes. If not configured, returns 503.
 */
async function POSTHandler(request: NextRequest) {
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

    // Check if user has encrypted LLM config and decrypt it
    const hasEncryptedKey = await hasEncryptedApiKey(user.id);
    if (hasEncryptedKey) {
      try {
        // Decrypt the API key using the login password
        const apiKey = await decryptApiKey(user.id, validatedData.password);

        // Set temp key cookie for use in LLM calls
        cookieStore.set('llm_temp_key', apiKey, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });
      } catch (error) {
        // Log error but don't fail login - user can re-enter their API key
        console.error('Failed to decrypt LLM config on login:', error);
      }
    }

    // Return user
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    // Handle ConfigError (app not configured)
    if (error instanceof ConfigError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            setupUrl: error.setupUrl
          }
        },
        { status: 503 },
      );
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid input', details: error.issues } },
        { status: 400 },
      );
    }

    // Handle known domain errors
    if (error instanceof Error) {
      // Check for database table/connection errors first
      if (isTableNotFoundError(error)) {
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_NOT_READY',
              message: 'Database tables not found. Please complete the database setup.',
              setupUrl: '/setup'
            }
          },
          { status: 503 },
        );
      }

      if (isConnectionError(error)) {
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_NOT_READY',
              message: 'Cannot connect to database. Please check your database configuration.',
              setupUrl: '/setup'
            }
          },
          { status: 503 },
        );
      }

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

// Export with configuration check wrapper
export const POST = withConfigCheck(POSTHandler);
