/**
 * POST /api/user/llm-config/test
 *
 * Test LLM connection with provided credentials.
 * Used to validate credentials before saving.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/middleware';
import { LLMServiceInterface } from '@/lib/services/llm/llm.service';
import { setTempLLMConfig, clearTempLLMConfig } from '@/lib/services/llm/config';

// Validation schema
const testSchema = z.object({
  apiUrl: z.string().url('Invalid API URL format'),
  apiKey: z.string().min(10, 'API Key is required'),
  model: z.string().min(1, 'Model is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticate(request);

    // Validate request body
    const body = await request.json();
    const validatedData = testSchema.parse(body);

    // Set temporary config for testing
    setTempLLMConfig({
      url: validatedData.apiUrl,
      apiKey: validatedData.apiKey,
      model: validatedData.model,
    });

    // Test connection
    const result = await LLMServiceInterface.testConnection();

    // Clear temp config after test
    clearTempLLMConfig();

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: { code: 'LLM_CONNECTION_FAILED', message: result.error || 'Connection test failed' } },
        { status: 400 }
      );
    }
  } catch (error) {
    // Clear temp config on error
    clearTempLLMConfig();

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid input', details: error.issues } },
        { status: 400 }
      );
    }

    // Handle auth errors
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Handle unknown errors
    console.error('LLM test error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
