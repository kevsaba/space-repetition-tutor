/**
 * GET /api/sessions/:sessionId
 *
 * Get session details with progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionService, SessionError } from '@/lib/services/session.service';
import { authenticate } from '@/lib/middleware';

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Get sessionId from params
    const { sessionId } = await context.params;

    // Get session progress
    const result = await SessionService.getSessionProgress(sessionId, userId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SessionError) {
      if (error.code === 'SESSION_NOT_FOUND') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: error.message } },
          { status: 404 },
        );
      }
      if (error.code === 'FORBIDDEN') {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: error.message } },
          { status: 403 },
        );
      }
    }

    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('Get session error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
