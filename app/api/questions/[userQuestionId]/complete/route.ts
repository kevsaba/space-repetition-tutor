/**
 * POST /api/questions/[userQuestionId]/complete
 *
 * Complete a question session after all follow-ups.
 * Calculates the final box level based on ALL answers (original + follow-ups).
 * Rule: ALL passed = promote, ANY failed = Box 1.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LeitnerService } from '@/lib/services/leitner.service';
import { authenticate } from '@/lib/middleware';

interface RouteContext {
  params: Promise<{
    userQuestionId: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Get userQuestionId from params
    const { userQuestionId } = await context.params;

    // Fetch UserQuestion with all answers
    const userQuestion = await prisma.userQuestion.findUnique({
      where: { id: userQuestionId },
      include: {
        question: true,
        answers: {
          orderBy: { answeredAt: 'asc' },
        },
      },
    });

    if (!userQuestion) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Question not found' } },
        { status: 404 },
      );
    }

    // Verify ownership
    if (userQuestion.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 },
      );
    }

    if (userQuestion.answers.length === 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'No answers found for this question' } },
        { status: 400 },
      );
    }

    // Determine final pass/fail based on ALL answers (original + follow-ups)
    // ALL must pass for promotion, ANY fail results in Box 1
    const allPassed = userQuestion.answers.every((answer) => answer.passed);

    // Calculate new box and next due date using the final box calculation
    const currentBox = userQuestion.box;
    const newBox = LeitnerService.calculateFinalBox(currentBox, allPassed);
    const nextDueDate = LeitnerService.calculateNextDueDate(newBox);

    // Update UserQuestion with final box level
    await prisma.userQuestion.update({
      where: { id: userQuestionId },
      data: {
        box: newBox,
        dueDate: nextDueDate,
        lastSeenAt: new Date(),
        streak: allPassed ? userQuestion.streak + 1 : 0,
      },
    });

    // Count original vs follow-up answers
    const originalAnswers = userQuestion.answers.filter((a) => !a.isFollowUp);
    const followUpAnswers = userQuestion.answers.filter((a) => a.isFollowUp);

    // Return final result
    return NextResponse.json({
      passed: allPassed,
      currentBox,
      newBox,
      nextDueDate,
      answersCount: userQuestion.answers.length,
      originalAnswersCount: originalAnswers.length,
      followUpAnswersCount: followUpAnswers.length,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('Complete session error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
