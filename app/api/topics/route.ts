/**
 * GET /api/topics
 *
 * List all available topics for the dropdown selector.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Fetch all topics, ordered by name
    const topics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        track: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ topics });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('List topics error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
