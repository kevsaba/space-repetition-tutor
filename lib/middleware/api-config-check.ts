/**
 * API Configuration Check Middleware
 *
 * A wrapper function for API routes that ensures the application
 * is configured before allowing access to protected endpoints.
 *
 * This is preferred over Next.js middleware for protected routes
 * because:
 * - It can access runtime configuration (files)
 * - It works in Node.js runtime (not limited to Edge runtime)
 * - It provides type-safe handler wrapping
 */

import { NextResponse } from 'next/server';
import { isRuntimeConfigured } from '@/lib/config/runtime';
import type { NextRequest } from 'next/server';

/**
 * Response shape for unconfigured application
 */
interface UnconfiguredResponse {
  error: {
    code: 'APP_NOT_CONFIGURED';
    message: string;
    setupUrl: string;
  };
}

/**
 * Wraps an API route handler with a configuration check.
 *
 * If the app is not configured, returns a 503 Service Unavailable response
 * with a helpful message directing users to the setup wizard.
 *
 * @param handler - The API route handler to wrap
 * @returns A wrapped handler that checks configuration first
 *
 * @example
 * ```ts
 * export const POST = withConfigCheck(async (request: NextRequest) => {
 *   // Your handler logic - DATABASE_URL is guaranteed to be available
 *   const body = await request.json();
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withConfigCheck<T extends NextRequest = NextRequest>(
  handler: (request: T) => Promise<NextResponse> | NextResponse
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    // Check if application is configured
    if (!isRuntimeConfigured()) {
      const unconfiguredResponse: UnconfiguredResponse = {
        error: {
          code: 'APP_NOT_CONFIGURED',
          message: 'Application is not configured. Please complete setup first.',
          setupUrl: '/setup'
        }
      };

      return NextResponse.json(unconfiguredResponse, { status: 503 });
    }

    // Application is configured, proceed with the handler
    return handler(request);
  };
}

/**
 * Checks if the app is configured synchronously.
 * Useful for quick checks outside of the request flow.
 *
 * @returns true if the app is configured, false otherwise
 */
export function isAppConfigured(): boolean {
  return isRuntimeConfigured();
}
