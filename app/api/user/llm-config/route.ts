/**
 * GET/POST /api/user/llm-config
 *
 * Manage user's LLM configuration.
 *
 * GET: Returns user's LLM config (without exposing actual API key)
 * POST: Saves user's LLM config
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { LLMConfigService } from '@/lib/services/llm-config.service';
import { z } from 'zod';
import { cookies } from 'next/headers';

/**
 * Validation schema for POST requests
 */
const llmConfigSchema = z.object({
  apiUrl: z.string().url('Invalid API URL'),
  apiKey: z.string().optional(),
  model: z.string().min(1, 'Model is required'),
  storagePreference: z.enum(['SESSION', 'DATABASE']),
  strictnessLevel: z.enum(['DEFAULT', 'STRICT', 'LENIENT']).optional(),
  password: z.string().optional(),
});

/**
 * GET - Get user's LLM configuration
 *
 * Returns:
 * - apiUrl: The configured API endpoint
 * - model: The configured model
 * - storagePreference: SESSION or DATABASE
 * - hasApiKey: boolean indicating if API key is set
 *
 * Does NOT return the actual API key for security.
 */
export async function GET(request: NextRequest) {
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

    // Get user's LLM config
    const config = await LLMConfigService.getUserLLMConfig(payload.userId);

    if (!config) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'LLM configuration not found' } },
        { status: 404 }
      );
    }

    // For SESSION storage, check if temp key cookie exists
    let hasSessionKey = false;
    if (config.storagePreference === 'SESSION') {
      const tempKey = cookieStore.get('llm_temp_key')?.value;
      hasSessionKey = !!tempKey;
    }

    return NextResponse.json({
      config: {
        id: config.id,
        apiUrl: config.apiUrl,
        model: config.model,
        storagePreference: config.storagePreference,
        strictnessLevel: config.strictnessLevel,
        hasApiKey: config.storagePreference === 'SESSION' ? hasSessionKey : config.hasApiKey,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    console.error('Get LLM config error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}

/**
 * POST - Save user's LLM configuration
 *
 * Body:
 * - apiUrl: LLM API endpoint URL
 * - apiKey: API key (optional - if not provided, keeps existing)
 * - model: Model name
 * - storagePreference: SESSION or DATABASE
 * - password: Required for DATABASE storage with apiKey
 *
 * For SESSION storage:
 * - Sets llm_temp_key cookie with the API key
 * - Database stores config WITHOUT the key
 *
 * For DATABASE storage:
 * - Encrypts API key with password
 * - Stores encrypted key in database
 * - Does NOT set temp key cookie (decrypted on login)
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
    const validatedData = llmConfigSchema.parse(body);

    // Validate password requirement for DATABASE storage
    if (validatedData.storagePreference === 'DATABASE' && validatedData.apiKey) {
      if (!validatedData.password) {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: 'Password required for DATABASE storage' } },
          { status: 400 }
        );
      }
    }

    // Save configuration
    const config = await LLMConfigService.saveUserLLMConfig({
      userId: payload.userId,
      apiUrl: validatedData.apiUrl,
      apiKey: validatedData.apiKey,
      model: validatedData.model,
      storagePreference: validatedData.storagePreference,
      strictnessLevel: validatedData.strictnessLevel,
      password: validatedData.password,
    });

    // For SESSION storage, set the temp key cookie with the API key
    if (validatedData.storagePreference === 'SESSION' && validatedData.apiKey) {
      cookieStore.set('llm_temp_key', validatedData.apiKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    // For DATABASE storage with API key provided, also set the temp key cookie
    // This allows the user to immediately use LLM features without re-logging in
    if (validatedData.storagePreference === 'DATABASE' && validatedData.apiKey) {
      cookieStore.set('llm_temp_key', validatedData.apiKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return NextResponse.json({
      config: {
        id: config.id,
        apiUrl: config.apiUrl,
        model: config.model,
        storagePreference: config.storagePreference,
        strictnessLevel: config.strictnessLevel,
        hasApiKey: config.hasApiKey,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid input', details: error.issues } },
        { status: 400 }
      );
    }

    // Handle domain errors
    if (error instanceof Error) {
      if (error.message === 'Invalid or expired token') {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
          { status: 401 }
        );
      }

      // Check for LLMConfigError codes
      if (error.name === 'LLMConfigError') {
        const llmError = error as unknown as { code: string; message: string };
        if (llmError.code === 'PASSWORD_REQUIRED') {
          return NextResponse.json(
            { error: { code: 'PASSWORD_REQUIRED', message: llmError.message } },
            { status: 400 }
          );
        }
      }
    }

    console.error('Save LLM config error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete user's LLM configuration
 *
 * Removes the user's LLM config including any encrypted API key.
 */
export async function DELETE(request: NextRequest) {
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

    // Delete configuration
    await LLMConfigService.deleteUserLLMConfig(payload.userId);

    // Clear temp key cookie if exists
    cookieStore.delete('llm_temp_key');

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    console.error('Delete LLM config error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
