/**
 * POST /api/sessions
 *
 * Create a new study session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SessionService, SessionError } from '@/lib/services/session.service';
import { authenticate } from '@/lib/middleware';

// Validation schema
const createSessionSchema = z.object({
  mode: z.enum(['FREE', 'INTERVIEW']),
  careerId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Validate request body
    const body = await request.json();
    const validatedData = createSessionSchema.parse(body);

    // For INTERVIEW mode, careerId is required
    if (validatedData.mode === 'INTERVIEW' && !validatedData.careerId) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Career ID is required for INTERVIEW mode' } },
        { status: 400 },
      );
    }

    // Create session
    const session = await SessionService.createSession(
      userId,
      validatedData.mode,
      validatedData.careerId,
    );

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid input', details: error.issues } },
        { status: 400 },
      );
    }

    if (error instanceof SessionError) {
      if (error.code === 'CAREER_ID_REQUIRED') {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: error.message } },
          { status: 400 },
        );
      }
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

    console.error('Create session error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
