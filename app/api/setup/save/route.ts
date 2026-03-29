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
 *
 * LLM configuration is done per-user in settings, not globally.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveRuntimeConfig } from '@/lib/config/runtime';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SaveRequest {
  database: {
    url: string;
    directUrl: string;
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
      '# Setup completed at: ' + new Date().toISOString(),
    ].join('\n');

    fs.writeFileSync(envLocalPath, envContent, 'utf-8');
  } catch (error) {
    console.error('Failed to write .env.local:', error);
    // Don't throw - this is optional for setup wizard flow
  }
}

/**
 * Run Prisma schema push to set up database schema
 * This is called when a new user completes setup
 *
 * Uses "prisma db push" instead of migrations because:
 * 1. Fresh database has no _prisma_migrations table
 * 2. migrate deploy fails without that table
 * 3. db push creates all tables directly from schema
 * 4. Perfect for initial setup and self-hosted deployments
 */
async function runMigrations(): Promise<{ success: boolean; message: string }> {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
  };

  try {
    // Generate Prisma client first
    await execAsync('npx prisma generate', {
      env,
      cwd: process.cwd(),
      timeout: 60000,
    });

    // Push schema to database (creates all tables)
    const { stdout, stderr } = await execAsync('npx prisma db push --skip-generate', {
      env,
      cwd: process.cwd(),
      timeout: 60000,
    });

    if (stderr && !stderr.includes('warn')) {
      console.error('DB push stderr:', stderr);
    }

    console.log('DB push stdout:', stdout);
    return { success: true, message: 'Database schema created successfully.' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('DB push error:', error);
    return {
      success: false,
      message: `Failed to set up database: ${errorMsg}`
    };
  }
}

/**
 * POST handler for saving configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json();
    const { database } = body;

    // Validate required fields - only database now
    if (!database?.url || !database?.directUrl) {
      return NextResponse.json(
        { success: false, error: 'Database configuration is required' },
        { status: 400 }
      );
    }

    // Save to runtime config (for API routes) - only database now
    saveRuntimeConfig({
      isConfigured: true,
      database: {
        url: database.url,
        directUrl: database.directUrl,
      },
      llm: {
        // LLM config is per-user, set defaults here
        apiUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
      },
      setupCompletedAt: new Date().toISOString(),
    });

    // Also write to .env.local for middleware and next build
    writeEnvLocal({ database });

    // Set process.env for immediate use in this request lifecycle
    process.env.DATABASE_URL = database.url;
    process.env.DIRECT_URL = database.directUrl;

    // Run database migrations for new setup (with self-healing)
    const migrationResult = await runMigrations();

    if (!migrationResult.success) {
      console.error('Migration failed during setup:', migrationResult.message);
      // Return error so user knows what happened
      return NextResponse.json(
        { success: false, error: migrationResult.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: migrationResult.message,
    });
  } catch (error) {
    console.error('Setup save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
