/**
 * GET/POST /api/settings/config
 *
 * Get and update database and LLM configuration.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig, saveRuntimeConfig } from '@/lib/config/runtime';
import { AuthService } from '@/lib/services/auth.service';
import { cookies } from 'next/headers';

/**
 * GET - Fetch current configuration (masked for sensitive data)
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

    AuthService.verifyToken(token);

    // Get current config
    const config = getRuntimeConfig();

    if (!config) {
      return NextResponse.json(
        { error: { code: 'NOT_CONFIGURED', message: 'App not configured' } },
        { status: 404 }
      );
    }

    // Mask sensitive values (only show first 8 chars of API key)
    const maskedApiKey = config.llm.apiKey
      ? `${config.llm.apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, config.llm.apiKey.length - 8))}`
      : '';

    // Mask database URL (hide password)
    const maskDatabaseUrl = (url: string): string => {
      try {
        const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
        if (match) {
          return `${match[1]}****${match[3]}`;
        }
        return url;
      } catch {
        return '****';
      }
    };

    return NextResponse.json({
      database: {
        url: maskDatabaseUrl(config.database.url),
        directUrl: maskDatabaseUrl(config.database.directUrl),
      },
      llm: {
        apiUrl: config.llm.apiUrl,
        apiKey: maskedApiKey,
        model: config.llm.model,
      },
      setupCompletedAt: config.setupCompletedAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    console.error('Get config error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}

/**
 * POST - Update configuration
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

    const body = await request.json();
    const { database, llm } = body;

    // Get existing config
    const existingConfig = getRuntimeConfig();
    if (!existingConfig) {
      return NextResponse.json(
        { error: { code: 'NOT_CONFIGURED', message: 'App not configured' } },
        { status: 404 }
      );
    }

    // Validate and merge database config
    let newDatabaseUrl = existingConfig.database.url;
    let newDirectUrl = existingConfig.database.directUrl;

    if (database) {
      if (database.url !== undefined) {
        if (typeof database.url !== 'string' || database.url.trim().length === 0) {
          return NextResponse.json(
            { error: { code: 'INVALID_INPUT', message: 'Database URL is required' } },
            { status: 400 }
          );
        }
        if (!database.url.startsWith('postgresql://')) {
          return NextResponse.json(
            { error: { code: 'INVALID_INPUT', message: 'Database URL must start with postgresql://' } },
            { status: 400 }
          );
        }
        newDatabaseUrl = database.url.trim();
      }

      if (database.directUrl !== undefined) {
        if (typeof database.directUrl !== 'string' || database.directUrl.trim().length === 0) {
          return NextResponse.json(
            { error: { code: 'INVALID_INPUT', message: 'Direct URL is required' } },
            { status: 400 }
          );
        }
        newDirectUrl = database.directUrl.trim();
      }
    }

    // Validate and merge LLM config
    let newApiUrl = existingConfig.llm.apiUrl;
    let newApiKey = existingConfig.llm.apiKey;
    let newModel = existingConfig.llm.model;

    if (llm) {
      if (llm.apiUrl !== undefined) {
        if (typeof llm.apiUrl !== 'string' || llm.apiUrl.trim().length === 0) {
          return NextResponse.json(
            { error: { code: 'INVALID_INPUT', message: 'API URL is required' } },
            { status: 400 }
          );
        }
        newApiUrl = llm.apiUrl.trim();
      }

      if (llm.apiKey !== undefined) {
        if (typeof llm.apiKey !== 'string' || llm.apiKey.trim().length === 0) {
          return NextResponse.json(
            { error: { code: 'INVALID_INPUT', message: 'API Key is required' } },
            { status: 400 }
          );
        }
        if (llm.apiKey.length < 10) {
          return NextResponse.json(
            { error: { code: 'INVALID_INPUT', message: 'API Key appears to be invalid' } },
            { status: 400 }
          );
        }
        newApiKey = llm.apiKey.trim();
      }

      if (llm.model !== undefined) {
        if (typeof llm.model !== 'string' || llm.model.trim().length === 0) {
          return NextResponse.json(
            { error: { code: 'INVALID_INPUT', message: 'Model is required' } },
            { status: 400 }
          );
        }
        newModel = llm.model.trim();
      }
    }

    // Save updated config
    saveRuntimeConfig({
      isConfigured: true,
      database: {
        url: newDatabaseUrl,
        directUrl: newDirectUrl,
      },
      llm: {
        apiUrl: newApiUrl,
        apiKey: newApiKey,
        model: newModel,
      },
      setupCompletedAt: existingConfig.setupCompletedAt,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    console.error('Update config error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
