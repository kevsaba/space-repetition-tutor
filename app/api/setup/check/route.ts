/**
 * GET /api/setup/check
 *
 * Check if the application has been configured.
 * Returns the configuration status.
 * 
 * Checks both runtime config file and environment variables.
 */

import { NextResponse } from 'next/server';
import { isRuntimeConfigured } from '@/lib/config/runtime';

export async function GET() {
  return NextResponse.json({
    configured: isRuntimeConfigured(),
  });
}
