/**
 * GET /api/questions/due
 *
 * Fetch due questions for the authenticated user.
 *
 * Query Parameters:
 * - limit: Number of questions to return (default 5, max 20)
 * - mode: Session mode (FREE or INTERVIEW, default FREE)
 * - sessionId: Session ID for tracking (optional)
 * - topicId: Filter by topic ID (optional, only for FREE mode)
 * - excludeQuestionId: Exclude this question from results (for skip functionality)
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
    const topicId = searchParams.get('topicId') || undefined;
    const excludeQuestionId = searchParams.get('excludeQuestionId') || undefined;
    const forceNew = searchParams.get('forceNew') === 'true';
    const difficulty = searchParams.get('difficulty') as 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT' | undefined;

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

    // topicId is only valid for FREE mode
    if (topicId && mode !== 'FREE') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Topic filter is only available in FREE mode' } },
        { status: 400 },
      );
    }

    // forceNew is only valid for FREE mode
    if (forceNew && mode !== 'FREE') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Force new is only available in FREE mode' } },
        { status: 400 },
      );
    }

    // Validate difficulty if provided
    if (difficulty && !['JUNIOR', 'MID', 'SENIOR', 'EXPERT'].includes(difficulty)) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid difficulty level. Must be JUNIOR, MID, SENIOR, or EXPERT' } },
        { status: 400 },
      );
    }

    // Fetch due questions
    const result = await QuestionService.fetchDueQuestions(userId, mode, sessionId, limit, topicId, excludeQuestionId, forceNew, difficulty);

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
