/**
 * POST /api/questions/[userQuestionId]/answer
 *
 * Submit an answer for a question.
 * Evaluates the answer using LLM and provides structured feedback.
 * If follow-ups are generated, the box update is deferred until all follow-ups are answered.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { LeitnerService } from '@/lib/services/leitner.service';
import { llmService, LLMError } from '@/lib/services/llm';
import { authenticate } from '@/lib/middleware';
import type { LLMFeedbackResponse, LLMFollowUpResponse } from '@/lib/services/llm/types';
import type { Prisma } from '@prisma/client';

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

/**
 * Fallback feedback when LLM fails
 */
const FALLBACK_FEEDBACK: LLMFeedbackResponse['feedback'] = {
  evaluation: 'We encountered an issue evaluating your answer. Please try again.',
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
    const validatedData = answerSchema.parse(body);

    // Fetch UserQuestion with question details
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

    // Evaluate answer using LLM
    let evaluation: LLMFeedbackResponse;
    let passed = false;

    try {
      evaluation = await llmService.evaluateAnswer({
        question: userQuestion.question.content,
        userAnswer: validatedData.answer,
        currentBox: userQuestion.box,
        userId, // Pass userId for steering context
      });
      passed = evaluation.passed;
    } catch (error) {
      // If LLM fails, use fallback
      if (error instanceof LLMError) {
        console.error('LLM evaluation failed:', error.message);
        // Conservative: fail the question when evaluation fails
        passed = false;
        evaluation = {
          passed: false,
          feedback: FALLBACK_FEEDBACK,
        };
      } else {
        throw error;
      }
    }

    // Generate follow-up questions
    let followUpQuestions: LLMFollowUpResponse['followUpQuestions'] = [];

    try {
      const followUpResponse = await llmService.generateFollowUp({
        originalQuestion: userQuestion.question.content,
        userAnswer: validatedData.answer,
        passed,
        mode: validatedData.mode,
      });
      followUpQuestions = followUpResponse.followUpQuestions;
    } catch (error) {
      // If follow-up generation fails, continue without follow-ups
      if (error instanceof LLMError) {
        console.error('LLM follow-up generation failed:', error.message);
      } else {
        console.error('Unexpected error during follow-up generation:', error);
      }
    }

    const hasFollowUps = followUpQuestions.length > 0;

    // Record answer with feedback (always record the original answer)
    const answer = await prisma.answer.create({
      data: {
        userQuestionId,
        content: validatedData.answer,
        passed,
        feedback: evaluation.feedback as unknown as Prisma.InputJsonValue,
        sessionId: validatedData.sessionId,
        isFollowUp: false,
      },
    });

    // If NO follow-ups, apply box transition immediately (backward compatible)
    if (!hasFollowUps) {
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

      // Return response with immediate box update
      return NextResponse.json({
        passed,
        newBox,
        nextDueDate,
        feedback: evaluation.feedback,
        followUpQuestions,
        hasFollowUps: false,
        requiresCompletion: false,
        answerId: answer.id, // Include answer ID for rating
      });
    }

    // If follow-ups exist, hold box update until completion
    // Return response indicating follow-ups are pending
    return NextResponse.json({
      passed,
      feedback: evaluation.feedback,
      followUpQuestions,
      hasFollowUps: true,
      requiresCompletion: true,
      remainingFollowUps: followUpQuestions.length,
      answerId: answer.id, // Include answer ID for rating
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

    console.error('Submit answer error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
