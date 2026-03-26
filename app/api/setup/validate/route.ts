/**
 * POST /api/setup/validate
 *
 * Validates database or LLM configuration.
 * Does NOT store any credentials - only tests connectivity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

interface ValidationRequest {
  type: 'database' | 'llm';
  config: {
    databaseUrl?: string;
    directUrl?: string;
    apiUrl?: string;
    apiKey?: string;
    model?: string;
  };
}

interface ValidationResponse {
  success: boolean;
  error?: string;
}

/**
 * POST handler for configuration validation
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();
    const { type, config } = body;

    if (type === 'database') {
      return await validateDatabase(config);
    }

    if (type === 'llm') {
      return await validateLLM(config);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid validation type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Setup validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}

/**
 * Validate database connection
 */
async function validateDatabase(config: { databaseUrl?: string; directUrl?: string }): Promise<NextResponse<ValidationResponse>> {
  const { databaseUrl } = config;

  if (!databaseUrl) {
    return NextResponse.json(
      { success: false, error: 'Database URL is required' },
      { status: 400 }
    );
  }

  try {
    // Test database connection
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database validation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Could not connect to database. Please check your connection string.' },
      { status: 400 }
    );
  }
}

/**
 * Validate LLM API connection
 */
async function validateLLM(config: { apiUrl?: string; apiKey?: string; model?: string }): Promise<NextResponse<ValidationResponse>> {
  const { apiUrl, apiKey, model } = config;

  if (!apiUrl) {
    return NextResponse.json(
      { success: false, error: 'API URL is required' },
      { status: 400 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API Key is required' },
      { status: 400 }
    );
  }

  if (!model) {
    return NextResponse.json(
      { success: false, error: 'Model is required' },
      { status: 400 }
    );
  }

  try {
    // Ensure URL includes /chat/completions
    let testUrl = apiUrl;
    if (!testUrl.includes('/chat/completions')) {
      testUrl = testUrl.endsWith('/') ? `${testUrl}chat/completions` : `${testUrl}/chat/completions`;
    }

    // Make a minimal request to test the API
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
      // Short timeout for validation
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    }

    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    return NextResponse.json(
      {
        success: false,
        error: errorData.error?.message || `API returned ${response.status}: ${response.statusText}`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('LLM validation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Could not connect to LLM API. Please check your URL and API key.',
      },
      { status: 400 }
    );
  }
}
