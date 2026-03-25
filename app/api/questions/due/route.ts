/**
 * GET /api/questions/due
 *
 * Fetch due questions for the authenticated user.
 *
 * Query Parameters:
 * - limit: Number of questions to return (default 5, max 20)
 * - mode: Session mode (FREE or INTERVIEW, default FREE)
 * - sessionId: Session ID for tracking (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '@/lib/services/question.service';
import { authenticate } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Verify user still exists (handles case where DB was reset)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found. Please log out and sign up again.' } },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const mode = (searchParams.get('mode') || 'FREE') as 'FREE' | 'INTERVIEW';
    const sessionId = searchParams.get('sessionId') || undefined;

    // Validate limit
    if (limit < 1 || limit > 20) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Limit must be between 1 and 20' } },
        { status: 400 },
      );
    }

    // Validate mode
    if (mode !== 'FREE' && mode !== 'INTERVIEW') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Mode must be FREE or INTERVIEW' } },
        { status: 400 },
      );
    }

    // Fetch due questions
    const result = await QuestionService.fetchDueQuestions(userId, mode, sessionId, limit);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('Fetch due questions error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
