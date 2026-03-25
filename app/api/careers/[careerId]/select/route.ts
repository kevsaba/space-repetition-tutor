/**
 * POST /api/careers/:careerId/select
 *
 * Select a career track for the user.
 * Deactivates any previously active career.
 * Populates UserQuestion records for any uploaded questions in the career.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CareerService, CareerError } from '@/lib/services/career.service';
import { authenticate } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{
    careerId: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Get careerId from params
    const { careerId } = await context.params;

    // Select career
    const userCareer = await CareerService.selectCareer(userId, careerId);

    // Populate UserQuestion records for any uploaded questions in this career
    // This ensures that when a user selects a custom career (created from PDF upload),
    // all uploaded questions are immediately available for review

    // OPTIMIZATION: Use a single query to get all uploaded question IDs for this career
    // Then bulk create UserQuestion records only for those that don't exist yet
    const careerQuestions = await prisma.question.findMany({
      where: {
        type: 'UPLOADED',
        topic: {
          careerTopics: {
            some: {
              careerId,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (careerQuestions.length > 0) {
      // Get existing UserQuestion IDs for this user in a single query
      const existingUserQuestions = await prisma.userQuestion.findMany({
        where: {
          userId,
          questionId: {
            in: careerQuestions.map((q) => q.id),
          },
        },
        select: {
          questionId: true,
        },
      });

      const existingQuestionIds = new Set(existingUserQuestions.map((uq) => uq.questionId));

      // Filter out questions that already have UserQuestion records
      const newQuestionIds = careerQuestions
        .map((q) => q.id)
        .filter((id) => !existingQuestionIds.has(id));

      // Bulk create UserQuestion records for new questions
      if (newQuestionIds.length > 0) {
        await prisma.userQuestion.createMany({
          data: newQuestionIds.map((questionId) => ({
            userId,
            questionId,
            box: 1,
            dueDate: new Date(),
            streak: 0,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ userCareer });
  } catch (error) {
    if (error instanceof CareerError) {
      if (error.code === 'CAREER_NOT_FOUND') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: error.message } },
          { status: 404 },
        );
      }
    }

    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('Select career error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
