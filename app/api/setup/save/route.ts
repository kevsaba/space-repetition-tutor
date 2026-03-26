/**
 * POST /api/setup/save
 *
 * Saves configuration to config/runtime.json and .env.local.
 *
 * IMPORTANT: We write to both locations because:
 * 1. config/runtime.json - Used by API routes (Node.js runtime) to read config
 * 2. .env.local - Used by Next.js at build time and middleware (Edge runtime)
 *
 * Note: Changes to .env.local require a server restart to take effect for middleware.
 * However, runtime.json changes are picked up immediately by API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveRuntimeConfig } from '@/lib/config/runtime';
import fs from 'fs';
import path from 'path';

interface SaveRequest {
  database: {
    url: string;
    directUrl: string;
  };
  llm: {
    apiUrl: string;
    apiKey: string;
    model: string;
  };
}

/**
 * Write configuration to .env.local file
 * This is needed for middleware (Edge runtime) which can't read files
 */
function writeEnvLocal(config: SaveRequest): void {
  try {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envContent = [
      '# Database Configuration',
      `DATABASE_URL="${config.database.url}"`,
      `DIRECT_URL="${config.database.directUrl}"`,
      '',
      '# LLM Configuration',
      `LLM_API_URL="${config.llm.apiUrl}"`,
      `LLM_API_KEY="${config.llm.apiKey}"`,
      `LLM_MODEL="${config.llm.model}"`,
      '',
      '# Setup completed at: ' + new Date().toISOString(),
    ].join('\n');

    fs.writeFileSync(envLocalPath, envContent, 'utf-8');
  } catch (error) {
    console.error('Failed to write .env.local:', error);
    // Don't throw - this is optional for setup wizard flow
  }
}

/**
 * POST handler for saving configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json();
    const { database, llm } = body;

    // Validate required fields
    if (!database?.url || !database?.directUrl) {
      return NextResponse.json(
        { success: false, error: 'Database configuration is required' },
        { status: 400 }
      );
    }

    if (!llm?.apiKey || !llm?.model) {
      return NextResponse.json(
        { success: false, error: 'LLM configuration is required' },
        { status: 400 }
      );
    }

    // Save to runtime config (for API routes)
    saveRuntimeConfig({
      isConfigured: true,
      database: {
        url: database.url,
        directUrl: database.directUrl,
      },
      llm: {
        apiUrl: llm.apiUrl || 'https://api.openai.com/v1',
        apiKey: llm.apiKey,
        model: llm.model,
      },
      setupCompletedAt: new Date().toISOString(),
    });

    // Also write to .env.local for middleware and next build
    writeEnvLocal({ database, llm });

    // Set process.env for immediate use in this request lifecycle
    process.env.DATABASE_URL = database.url;
    process.env.DIRECT_URL = database.directUrl;
    process.env.LLM_API_URL = llm.apiUrl || 'https://api.openai.com/v1';
    process.env.LLM_API_KEY = llm.apiKey;
    process.env.LLM_MODEL = llm.model;

    return NextResponse.json({
      success: true,
      message: 'Configuration saved. Please restart the server for middleware changes to take effect.',
    });
  } catch (error) {
    console.error('Setup save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
