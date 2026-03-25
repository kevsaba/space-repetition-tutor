/**
 * GET /api/careers
 *
 * List all available career tracks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CareerService, CareerError } from '@/lib/services/career.service';
import { authenticate } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    await authenticate(request);

    // Fetch all careers
    const careers = await CareerService.getAllCareers();

    return NextResponse.json({ careers });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('List careers error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
