/**
 * POST /api/questions/[userQuestionId]/followup
 *
 * Submit a follow-up answer for a question.
 * Evaluates the follow-up answer using LLM and provides structured feedback.
 * The box is NOT updated until all follow-ups are completed via the /complete endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { llmService, LLMError } from '@/lib/services/llm';
import { authenticate } from '@/lib/middleware';
import type { LLMFeedbackResponse } from '@/lib/services/llm/types';
import type { Prisma } from '@prisma/client';

// Validation schema
const followUpAnswerSchema = z.object({
  answer: z.string().min(1),
  followUpQuestion: z.string().min(1), // The follow-up question text
  sessionId: z.string().optional(),
});

interface RouteContext {
  params: Promise<{
    userQuestionId: string;
  }>;
}

/**
 * Fallback feedback when LLM fails
 */
const FALLBACK_FEEDBACK: LLMFeedbackResponse['feedback'] = {
  evaluation: 'We encountered an issue evaluating your follow-up answer. Please try again.',
  higherLevelArticulation: 'N/A',
  correction: 'N/A',
  failureTimeline: 'N/A',
  interviewReadyAnswer: 'N/A',
  analogy: 'N/A',
  productionInsight: 'N/A',
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Get userQuestionId from params
    const { userQuestionId } = await context.params;

    // Validate request body
    const body = await request.json();
    const validatedData = followUpAnswerSchema.parse(body);

    // Fetch UserQuestion with question details
    const userQuestion = await prisma.userQuestion.findUnique({
      where: { id: userQuestionId },
      include: {
        question: true,
        answers: {
          where: { isFollowUp: false },
          orderBy: { answeredAt: 'desc' },
          take: 1,
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

    // Check that there's an original answer (follow-ups can only come after original)
    if (userQuestion.answers.length === 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'No original answer found. Please answer the original question first.' } },
        { status: 400 },
      );
    }

    // Evaluate follow-up answer using LLM
    let evaluation: LLMFeedbackResponse;
    let passed = false;

    try {
      evaluation = await llmService.evaluateFollowUp({
        originalQuestion: userQuestion.question.content,
        followUpQuestion: validatedData.followUpQuestion,
        userAnswer: validatedData.answer,
      });
      passed = evaluation.passed;
    } catch (error) {
      // If LLM fails, use fallback
      if (error instanceof LLMError) {
        console.error('LLM follow-up evaluation failed:', error.message);
        // Conservative: fail the follow-up when evaluation fails
        passed = false;
        evaluation = {
          passed: false,
          feedback: FALLBACK_FEEDBACK,
        };
      } else {
        throw error;
      }
    }

    // Record follow-up answer with feedback
    await prisma.answer.create({
      data: {
        userQuestionId,
        content: validatedData.answer,
        passed,
        feedback: evaluation.feedback as unknown as Prisma.InputJsonValue,
        sessionId: validatedData.sessionId,
        isFollowUp: true,
        followUpQuestion: validatedData.followUpQuestion,
      },
    });

    // Return response with feedback
    // The frontend is responsible for tracking how many follow-ups remain
    return NextResponse.json({
      passed,
      feedback: evaluation.feedback,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid input', details: error.issues } },
        { status: 400 },
      );
    }

    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('Submit follow-up answer error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
