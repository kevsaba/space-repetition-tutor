/**
 * QuestionService - Fetch Due Questions
 *
 * Fetches due questions for a user, prioritizing Box 1 → Box 2 → Box 3.
 * If not enough due questions, generates new questions via LLM.
 */

import { prisma } from '../prisma';
import { LeitnerService } from './leitner.service';
import { llmService } from './llm';
import { LLMError } from './llm/errors';
import type { Question, UserQuestion, Topic } from '@prisma/client';
import type { QuestionDifficulty, QuestionType } from './llm/types';

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
 * Fetch new questions for a user.
 *
 * First tries to get template questions from database.
 * If not enough, generates new questions via LLM.
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

  // First try: Fetch template questions the user hasn't seen
  const templateQuestions = await prisma.question.findMany({
    where: {
      isTemplate: true,
      id: { notIn: seenQuestionIds },
    },
    take: limit,
  });

  // If we have enough template questions, return them
  if (templateQuestions.length >= limit) {
    return templateQuestions;
  }

  // Not enough templates? Generate new questions via LLM
  const remaining = limit - templateQuestions.length;
  const generatedQuestions = await generateQuestionsWithLLM(userId, remaining);

  return [...templateQuestions, ...generatedQuestions];
}

/**
 * Generate new questions using LLM.
 *
 * @param userId - User ID
 * @param count - Number of questions to generate
 * @returns Generated questions
 */
async function generateQuestionsWithLLM(
  userId: string,
  count: number,
): Promise<Question[]> {
  try {
    // Get user's focus topics (or use default topics)
    const topics = await getUserFocusTopics(userId);

    // Generate questions for each topic until we have enough
    const generatedQuestions: Question[] = [];
    const topicCount = Math.ceil(count / Math.max(1, topics.length));

    for (const topic of topics) {
      if (generatedQuestions.length >= count) break;

      try {
        const response = await llmService.generateQuestions({
          topic: topic.name,
          difficulty: topic.difficulty as QuestionDifficulty,
          type: 'CONCEPTUAL' as QuestionType,
          count: Math.min(topicCount, count - generatedQuestions.length),
        });

        // Store generated questions as templates in database
        for (const q of response.questions) {
          // Find or create topic
          let topicRecord = await prisma.topic.findUnique({
            where: { name: topic.name },
          });

          if (!topicRecord) {
            topicRecord = await prisma.topic.create({
              data: {
                name: topic.name,
                category: topic.category,
                track: topic.track as 'JAVA' | 'PYTHON' | 'DISTRIBUTED_SYSTEMS' | 'GENERAL',
                difficulty: topic.difficulty as 'JUNIOR' | 'MID' | 'SENIOR',
                isTemplate: true,
              },
            });
          }

          // Create question
          const question = await prisma.question.create({
            data: {
              content: q.content,
              type: q.type,
              difficulty: q.difficulty,
              topicId: topicRecord.id,
              isTemplate: true,
              createdBy: userId,
              expectedTopics: q.expectedTopics,
              hint: q.hint,
            },
          });

          generatedQuestions.push(question);
        }
      } catch (error) {
        // Log error but continue with other topics
        console.error(`Failed to generate questions for topic ${topic.name}:`, error);
      }
    }

    if (generatedQuestions.length === 0) {
      console.warn('No questions were generated from LLM. This may be due to:');
      console.warn('  1. No topics configured for the user');
      console.warn('  2. LLM API authentication issues (check LLM_API_KEY)');
      console.warn('  3. LLM API connectivity issues (check LLM_URL)');
      console.warn('  4. LLM service unavailable or rate limiting');
    }

    return generatedQuestions;
  } catch (error) {
    // If LLM generation fails, log and return empty array
    // (fall back to template questions only)
    if (error instanceof LLMError) {
      console.error('LLM question generation failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
    } else {
      console.error('Unexpected error during question generation:', error);
    }
    return [];
  }
}

/**
 * Get user's focus topics for question generation.
 *
 * @param userId - User ID
 * @returns Focus topics
 */
async function getUserFocusTopics(
  userId: string,
): Promise<Array<{ name: string; category: string; track: string; difficulty: string }>> {
  // Try to get topics from user's active career track
  const userCareer = await prisma.userCareer.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      career: {
        include: {
          careerTopics: {
            include: {
              topic: true,
            },
            orderBy: {
              order: 'asc',
            },
            take: 3, // Focus on first 3 topics
          },
        },
      },
    },
  });

  if (userCareer) {
    return userCareer.career.careerTopics.map((ct) => ({
      name: ct.topic.name,
      category: ct.topic.category,
      track: ct.topic.track,
      difficulty: ct.topic.difficulty,
    }));
  }

  // Default topics if no career track
  return [
    { name: 'Java Concurrency', category: 'Backend', track: 'JAVA', difficulty: 'MID' },
    { name: 'REST API Design', category: 'Backend', track: 'GENERAL', difficulty: 'MID' },
    { name: 'Database Design', category: 'Database', track: 'GENERAL', difficulty: 'MID' },
  ];
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
    id: uq.id, // UserQuestion ID - needed for answer submission
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
