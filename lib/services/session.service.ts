/**
 * SessionService - Session Management
 *
 * Handles session creation and tracking for both FREE and INTERVIEW modes.
 */

import { prisma } from '../prisma';
import type { SessionMode } from '@prisma/client';

/**
 * Domain error for session-related operations
 */
export class SessionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SessionError';
  }
}

/**
 * Session progress data
 */
export interface SessionProgress {
  questionsAnswered: number;
  questionsPassed: number;
  questionsFailed: number;
}

/**
 * Create a new study session.
 *
 * @param userId - User ID
 * @param mode - Session mode (FREE or INTERVIEW)
 * @param careerId - Career ID (required for INTERVIEW mode)
 * @returns Created session
 * @throws SessionError if careerId is required but not provided
 */
export async function createSession(
  userId: string,
  mode: SessionMode,
  careerId?: string,
): Promise<{
  id: string;
  mode: SessionMode;
  status: string;
  startedAt: Date;
}> {
  // For INTERVIEW mode, careerId is required
  if (mode === 'INTERVIEW' && !careerId) {
    throw new SessionError('Career ID is required for INTERVIEW mode', 'CAREER_ID_REQUIRED');
  }

  // For INTERVIEW mode, verify career exists
  if (mode === 'INTERVIEW' && careerId) {
    const career = await prisma.career.findUnique({
      where: { id: careerId },
    });

    if (!career) {
      throw new SessionError('Career not found', 'CAREER_NOT_FOUND');
    }
  }

  const session = await prisma.session.create({
    data: {
      userId,
      mode,
      careerId: mode === 'INTERVIEW' ? careerId : null,
      status: 'IN_PROGRESS',
    },
  });

  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    startedAt: session.startedAt,
  };
}

/**
 * Complete a session.
 *
 * @param sessionId - Session ID
 * @param userId - User ID (for authorization)
 * @returns Updated session
 * @throws SessionError if session not found or not owned by user
 */
export async function completeSession(
  sessionId: string,
  userId: string,
): Promise<{
  id: string;
  status: string;
  completedAt: Date;
}> {
  // Verify session exists and belongs to user
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new SessionError('Session not found', 'SESSION_NOT_FOUND');
  }

  if (session.userId !== userId) {
    throw new SessionError('Access denied', 'FORBIDDEN');
  }

  // Update session status
  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  return {
    id: updated.id,
    status: updated.status,
    completedAt: updated.completedAt!,
  };
}

/**
 * Get session progress (answer counts).
 *
 * @param sessionId - Session ID
 * @param userId - User ID (for authorization)
 * @returns Session details with progress
 * @throws SessionError if session not found or not owned by user
 */
export async function getSessionProgress(
  sessionId: string,
  userId: string,
): Promise<{
  session: {
    id: string;
    mode: SessionMode;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    career: { id: string; name: string } | null;
  };
  progress: SessionProgress;
}> {
  // Get session with ownership check
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
  });

  if (!session) {
    throw new SessionError('Session not found', 'SESSION_NOT_FOUND');
  }

  // Fetch career separately if careerId exists
  let career: { id: string; name: string } | null = null;
  if (session.careerId) {
    const careerRecord = await prisma.career.findUnique({
      where: { id: session.careerId },
    });
    if (careerRecord) {
      career = {
        id: careerRecord.id,
        name: careerRecord.name,
      };
    }
  }

  // Count answers for this session
  const answers = await prisma.answer.findMany({
    where: {
      sessionId,
    },
  });

  const questionsAnswered = answers.length;
  const questionsPassed = answers.filter((a) => a.passed).length;
  const questionsFailed = questionsAnswered - questionsPassed;

  return {
    session: {
      id: session.id,
      mode: session.mode,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      career,
    },
    progress: {
      questionsAnswered,
      questionsPassed,
      questionsFailed,
    },
  };
}

/**
 * Get session by ID (for authorization checks)
 *
 * @param sessionId - Session ID
 * @returns Session or null
 */
export async function getSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
  });
}

/**
 * SessionService interface for dependency injection
 */
export const SessionService = {
  createSession,
  completeSession,
  getSessionProgress,
  getSessionById,
} as const;

export type SessionService = typeof SessionService;
