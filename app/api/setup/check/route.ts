/**
 * GET /api/setup/check
 *
 * Check if the application has been configured.
 * Returns the configuration status.
 *
 * Checks both runtime config file and environment variables,
 * AND verifies the database is actually accessible and tables exist.
 */

import { NextResponse } from 'next/server';
import { isRuntimeConfigured } from '@/lib/config/runtime';
import { checkDatabaseHealth } from '@/lib/services/database-health.service';

export async function GET() {
  const hasConfig = isRuntimeConfigured();

  // If no config is set, we're definitely not configured
  if (!hasConfig) {
    return NextResponse.json({
      configured: false,
      reason: 'no_config',
    });
  }

  // Config exists, but verify database is actually ready
  // This catches cases where tables were dropped but DATABASE_URL still exists
  const healthCheck = await checkDatabaseHealth();

  if (!healthCheck.healthy) {
    return NextResponse.json({
      configured: false,
      reason: healthCheck.message,
      needsDatabaseSetup: true,
    });
  }

  return NextResponse.json({
    configured: true,
  });
}
