/**
 * GET /api/stats
 *
 * Get user statistics for the dashboard.
 *
 * Returns:
 * - Box distribution (questions in boxes 1, 2, 3)
 * - Total questions answered
 * - Questions answered today
 * - Current streak
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware';
import { StatsService } from '@/lib/services/stats.service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Verify user still exists (handles case where DB was reset)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found. Please log out and sign up again.' } },
        { status: 401 },
      );
    }

    // Get user stats
    const stats = await StatsService.getUserStats(userId);

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
