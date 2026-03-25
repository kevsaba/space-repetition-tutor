/**
 * POST /api/careers/:careerId/select
 *
 * Select a career track for the user.
 * Deactivates any previously active career.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CareerService, CareerError } from '@/lib/services/career.service';
import { authenticate } from '@/lib/middleware';

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
