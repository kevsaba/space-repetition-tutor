/**
 * GET /api/questions/due
 *
 * Fetch due questions for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '@/lib/services/question.service';
import { authenticate } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const sessionId = searchParams.get('sessionId') || undefined;

    // Validate limit
    if (limit < 1 || limit > 20) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Limit must be between 1 and 20' } },
        { status: 400 },
      );
    }

    // Fetch due questions
    const result = await QuestionService.fetchDueQuestions(userId, sessionId, limit);

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
