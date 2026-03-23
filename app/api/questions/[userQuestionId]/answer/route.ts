/**
 * POST /api/questions/[userQuestionId]/answer
 *
 * Submit an answer for a question.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { LeitnerService } from '@/lib/services/leitner.service';
import { authenticate } from '@/lib/middleware';

// Validation schema
const answerSchema = z.object({
  answer: z.string().min(1),
  mode: z.enum(['FREE', 'INTERVIEW']),
  sessionId: z.string().optional(),
});

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

    // Validate request body
    const body = await request.json();
    const validatedData = answerSchema.parse(body);

    // Fetch UserQuestion
    const userQuestion = await prisma.userQuestion.findUnique({
      where: { id: userQuestionId },
      include: { question: true },
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

    // Phase 1: Always pass (LLM evaluation in Phase 2)
    const passed = true;

    // Calculate new box and next due date (deterministic)
    const newBox = LeitnerService.calculateNewBox(userQuestion.box, passed);
    const nextDueDate = LeitnerService.calculateNextDueDate(newBox);

    // Update UserQuestion
    await prisma.userQuestion.update({
      where: { id: userQuestionId },
      data: {
        box: newBox,
        dueDate: nextDueDate,
        lastSeenAt: new Date(),
        streak: passed ? userQuestion.streak + 1 : 0,
      },
    });

    // Record answer
    await prisma.answer.create({
      data: {
        userQuestionId,
        content: validatedData.answer,
        passed,
        feedback: {}, // Empty for Phase 1
        sessionId: validatedData.sessionId,
      },
    });

    // Return response
    return NextResponse.json({
      passed,
      newBox,
      nextDueDate,
      followUpQuestions: [], // Empty for Phase 1
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid input', details: error.errors } },
        { status: 400 },
      );
    }

    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('Submit answer error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
