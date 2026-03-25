/**
 * GET /api/careers/active
 *
 * Get the user's active career track with topics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CareerService, CareerError } from '@/lib/services/career.service';
import { authenticate } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Get active career
    const result = await CareerService.getActiveCareer(userId);

    return NextResponse.json({
      userCareer: {
        id: result.id,
        career: {
          id: result.id,
          name: result.name,
          description: result.description,
        },
        isActive: true,
        startedAt: result.startedAt,
      },
      topics: result.topics,
    });
  } catch (error) {
    if (error instanceof CareerError) {
      if (error.code === 'NO_ACTIVE_CAREER') {
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

    console.error('Get active career error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
