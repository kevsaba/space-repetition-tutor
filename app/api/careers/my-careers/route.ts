/**
 * GET /api/careers/my-careers
 *
 * List all of the user's careers (both template and custom).
 */

import { NextRequest, NextResponse } from 'next/server';
import { CareerService } from '@/lib/services/career.service';
import { authenticate } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Fetch user's careers
    const careers = await CareerService.getUserCareers(userId);

    return NextResponse.json({ careers });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('List user careers error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
