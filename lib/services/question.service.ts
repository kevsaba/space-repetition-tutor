/**
 * QuestionService - Fetch Due Questions
 *
 * Fetches due questions for a user, prioritizing Box 1 → Box 2 → Box 3.
 * If not enough due questions, creates new questions from template pool.
 *
 * For Phase 1 (before LLM integration), uses seed data from database.
 */

import { prisma } from '../prisma';
import { LeitnerService } from './leitner.service';
import type { Question, UserQuestion, Topic } from '@prisma/client';

/**
 * Due question with additional metadata
 */
export interface DueQuestion {
  id: string;
  content: string;
  topic: {
    id: string;
    name: string;
    category: string;
    track: string;
  };
  box: number;
  timesSeen: number;
  isNew: boolean;
  type: string;
  difficulty: string;
}

/**
 * Fetch due questions output
 */
export interface FetchDueQuestionsOutput {
  questions: DueQuestion[];
  hasNewQuestionsAvailable: boolean;
  sessionId?: string;
}

/**
 * Fetch due questions for a user.
 *
 * Algorithm:
 * 1. Fetch UserQuestions where dueDate <= now() and userId = userId
 * 2. Order by: box ASC, dueDate ASC, lastSeenAt ASC
 * 3. Take limit (default 5)
 * 4. If not enough, fetch new template questions
 * 5. Create UserQuestion entries for new questions (Box 1, due now)
 * 6. Return questions + whether more are available
 *
 * @param userId - User ID
 * @param sessionId - Session ID (for tracking)
 * @param limit - Number of questions to return (default 5)
 * @returns Due questions and availability flag
 */
export async function fetchDueQuestions(
  userId: string,
  sessionId?: string,
  limit: number = 5,
): Promise<FetchDueQuestionsOutput> {
  const now = new Date();

  // 1. Fetch due questions
  const dueUserQuestions = await prisma.userQuestion.findMany({
    where: {
      userId,
      dueDate: { lte: now },
    },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: [
      { box: 'asc' }, // Box 1 first
      { dueDate: 'asc' }, // Earliest due first
      { lastSeenAt: 'asc' }, // Haven't seen in a while
    ],
    take: limit,
  });

  // 2. If we have enough due questions, return them
  if (dueUserQuestions.length >= limit) {
    return {
      questions: mapToDueQuestions(dueUserQuestions),
      hasNewQuestionsAvailable: false,
      sessionId,
    };
  }

  // 3. Not enough due questions? Fetch new ones
  const remaining = limit - dueUserQuestions.length;
  const newQuestions = await fetchNewQuestions(userId, remaining);

  // 4. Create UserQuestion entries for new questions (Box 1, due now)
  await prisma.userQuestion.createMany({
    data: newQuestions.map((q) => ({
      userId,
      questionId: q.id,
      box: 1,
      dueDate: now,
    })),
    skipDuplicates: true,
  });

  // 5. Fetch the newly created user questions
  const newUserQuestions = await prisma.userQuestion.findMany({
    where: {
      userId,
      questionId: { in: newQuestions.map((q) => q.id) },
    },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
    },
  });

  // 6. Return combined results
  const allQuestions = [...dueUserQuestions, ...newUserQuestions];

  return {
    questions: mapToDueQuestions(allQuestions),
    hasNewQuestionsAvailable: await hasMoreNewQuestions(userId),
    sessionId,
  };
}

/**
 * Fetch new template questions that the user hasn't seen yet.
 *
 * For Phase 1: Fetches template questions from database.
 * For Phase 2: Will use LLM to generate new questions.
 *
 * @param userId - User ID
 * @param limit - Number of questions to fetch
 * @returns New questions
 */
async function fetchNewQuestions(
  userId: string,
  limit: number,
): Promise<Question[]> {
  // Get question IDs the user has already seen
  const seenQuestionIds = (
    await prisma.userQuestion.findMany({
      where: { userId },
      select: { questionId: true },
    })
  ).map((uq) => uq.questionId);

  // Fetch template questions the user hasn't seen
  const newQuestions = await prisma.question.findMany({
    where: {
      isTemplate: true,
      id: { notIn: seenQuestionIds },
    },
    take: limit,
  });

  // If no template questions available, we'll need LLM generation (Phase 2)
  // For now, return empty array
  return newQuestions;
}

/**
 * Check if there are more new questions available for the user.
 *
 * @param userId - User ID
 * @returns True if more questions available
 */
async function hasMoreNewQuestions(userId: string): Promise<boolean> {
  const seenQuestionIds = (
    await prisma.userQuestion.findMany({
      where: { userId },
      select: { questionId: true },
    })
  ).map((uq) => uq.questionId);

  const availableTemplates = await prisma.question.count({
    where: {
      isTemplate: true,
      id: { notIn: seenQuestionIds },
    },
  });

  return availableTemplates > 0;
}

/**
 * Map UserQuestion entities to DueQuestion output format.
 */
function mapToDueQuestions(userQuestions: Array<UserQuestion & { question: Question & { topic: Topic } }>): DueQuestion[] {
  return userQuestions.map((uq) => ({
    id: uq.question.id,
    content: uq.question.content,
    topic: {
      id: uq.question.topic.id,
      name: uq.question.topic.name,
      category: uq.question.topic.category,
      track: uq.question.topic.track,
    },
    box: uq.box,
    timesSeen: uq.streak,
    isNew: uq.lastSeenAt === null,
    type: uq.question.type,
    difficulty: uq.question.difficulty,
  }));
}

/**
 * QuestionService interface for dependency injection
 */
export const QuestionService = {
  fetchDueQuestions,
} as const;

export type QuestionService = typeof QuestionService;
