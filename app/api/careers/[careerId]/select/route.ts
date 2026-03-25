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
    const activeCareer = await prisma.career.findUnique({
      where: { id: careerId },
      include: {
        careerTopics: {
          include: {
            topic: {
              include: {
                questions: {
                  where: {
                    type: 'UPLOADED',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (activeCareer) {
      // For each topic in the career, create UserQuestion records for uploaded questions
      for (const careerTopic of activeCareer.careerTopics) {
        const uploadedQuestions = careerTopic.topic.questions;

        // Create UserQuestion for any that don't exist
        for (const question of uploadedQuestions) {
          await prisma.userQuestion.upsert({
            where: {
              userId_questionId: { userId, questionId: question.id },
            },
            create: {
              userId,
              questionId: question.id,
              box: 1,
              dueDate: new Date(),
              streak: 0,
            },
            update: {}, // Don't modify if already exists
          });
        }
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
