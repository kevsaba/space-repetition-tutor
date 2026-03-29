/**
 * PUT /api/answers/[answerId]/feedback
 *
 * Submit user ratings for questions and feedback to steer LLM behavior.
 * Users can rate both the question quality and the feedback quality.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/middleware';
import type { Prisma } from '@prisma/client';

// Validation schema for feedback submission
const feedbackSchema = z.object({
  questionRating: z.enum(['THUMBS_UP', 'THUMBS_DOWN']).optional(),
  feedbackRating: z.enum(['THUMBS_UP', 'THUMBS_DOWN']).optional(),
});

interface RouteContext {
  params: Promise<{
    answerId: string;
  }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Get answerId from params
    const { answerId } = await context.params;

    // Validate request body - at least one rating must be provided
    const body = await request.json();
    const validatedData = feedbackSchema.parse(body);

    if (!validatedData.questionRating && !validatedData.feedbackRating) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'At least one rating must be provided' } },
        { status: 400 },
      );
    }

    // Fetch the answer with userQuestion to verify ownership
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        userQuestion: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!answer) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Answer not found' } },
        { status: 404 },
      );
    }

    // Verify ownership - the user must own the question this answer belongs to
    if (answer.userQuestion.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 },
      );
    }

    // Build update data with only provided fields
    const updateData: {
      questionRating?: 'THUMBS_UP' | 'THUMBS_DOWN';
      feedbackRating?: 'THUMBS_UP' | 'THUMBS_DOWN';
      ratedAt: Date;
    } = {
      ratedAt: new Date(),
    };

    if (validatedData.questionRating) {
      updateData.questionRating = validatedData.questionRating;
    }

    if (validatedData.feedbackRating) {
      updateData.feedbackRating = validatedData.feedbackRating;
    }

    // Update the answer with ratings
    const updatedAnswer = await prisma.answer.update({
      where: { id: answerId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      answerId: updatedAnswer.id,
      questionRating: updatedAnswer.questionRating,
      feedbackRating: updatedAnswer.feedbackRating,
      ratedAt: updatedAnswer.ratedAt,
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

    console.error('Submit feedback error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
