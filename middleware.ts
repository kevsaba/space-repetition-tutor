/**
 * Next.js Middleware
 *
 * Handles setup check and authentication redirection.
 *
 * Priority:
 * 1. Setup check - Redirect to /setup if not configured (bypass for auth routes)
 * 2. Authentication - Protect authenticated routes
 *
 * IMPORTANT: If user has an auth_token, we assume the app is configured.
 * This handles the case where setup just completed but the server hasn't
 * reloaded the .env.local file yet (dev mode only).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that bypass setup check (can be accessed even if not configured)
const SETUP_BYPASS_ROUTES = ['/setup', '/api/setup', '/login', '/signup', '/'];

// Routes that bypass auth check (can be accessed without authentication)
const AUTH_BYPASS_ROUTES = ['/login', '/signup', '/setup', '/api/setup', '/api/health', '/'];

// Routes that require authentication
const AUTH_REQUIRED_ROUTES = ['/dashboard', '/study', '/upload', '/settings', '/api/settings', '/api/questions', '/api/careers', '/api/sessions', '/api/stats'];

/**
 * Check if app is configured
 *
 * IMPORTANT: Middleware runs in Edge runtime where we can't read files.
 * We use a simple environment variable check here.
 * The setup wizard writes config to config/runtime.json and also to .env.local
 *
 * For deployment scenarios:
 * - Traditional: Uses environment variables (Docker, Vercel, etc.)
 * - Setup wizard: Runtime config + .env.local for middleware access
 *
 * Note: LLM configuration is now per-user (set in account settings), not global.
 * We only check for database configuration here.
 */
function isConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const configured = isConfigured();
  const authToken = request.cookies.get('auth_token')?.value;

  // IMPORTANT: If user has an auth_token, the app must be configured
  // (otherwise they couldn't have registered). Skip setup check.
  const isAuthenticated = !!authToken;

  // Only redirect to setup if:
  // - Not configured AND
  // - Not authenticated AND
  // - Not accessing a bypass route
  const isBypass = SETUP_BYPASS_ROUTES.some(route => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  });

  if (!configured && !isAuthenticated && !isBypass) {
    const url = new URL('/setup', request.url);
    return NextResponse.redirect(url);
  }

  // Check authentication for protected routes
  // Note: If user is authenticated, we allow access even if configured=false
  // (handles dev mode where .env.local wasn't reloaded)
  if ((configured || isAuthenticated) && AUTH_REQUIRED_ROUTES.some(route => pathname.startsWith(route) || pathname === route)) {
    if (!authToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
