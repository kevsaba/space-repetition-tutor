/**
 * Next.js Middleware
 *
 * Handles setup check and authentication redirection.
 *
 * Priority:
 * 1. Setup check - Redirect to /setup if not configured (bypass for auth routes)
 * 2. Authentication - Protect authenticated routes
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
 */
function isConfigured(): boolean {
  return !!(process.env.DATABASE_URL && process.env.LLM_API_KEY);
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

  // Only redirect to setup if not configured AND not accessing bypass routes
  // This allows /login and /signup to work even when not configured
  if (!configured && !SETUP_BYPASS_ROUTES.some(route => pathname.startsWith(route) || pathname === route)) {
    const url = new URL('/setup', request.url);
    return NextResponse.redirect(url);
  }

  // Check authentication for protected routes
  if (configured && AUTH_REQUIRED_ROUTES.some(route => pathname.startsWith(route) || pathname === route)) {
    const authToken = request.cookies.get('auth_token')?.value;
    
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
