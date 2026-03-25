/**
 * QuestionService - Fetch Due Questions
 *
 * Fetches due questions for a user with two modes:
 *
 * FREE mode: Prioritizes Box 1 → Box 2 → Box 3 (Leitner system)
 * INTERVIEW mode: Follows CareerTopic order for structured interview preparation
 *
 * If not enough due questions, generates new questions via LLM.
 */

import { prisma } from '../prisma';
import { LeitnerService } from './leitner.service';
import { llmService } from './llm';
import { LLMError } from './llm/errors';
import type { Question, UserQuestion, Topic } from '@prisma/client';
import type { QuestionDifficulty, QuestionType, SessionMode } from './llm/types';

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
 * Interview progress for INTERVIEW mode
 */
export interface InterviewProgress {
  currentTopicIndex: number;
  totalTopics: number;
  currentTopicName: string;
  questionsAnswered: number;
  questionsPerTopic: number;
}

/**
 * Fetch due questions output
 */
export interface FetchDueQuestionsOutput {
  questions: DueQuestion[];
  hasNewQuestionsAvailable: boolean;
  sessionId?: string;
  interviewProgress?: InterviewProgress; // Progress tracking for INTERVIEW mode
}

/**
 * Fetch due questions for a user.
 *
 * Algorithm:
 *
 * FREE mode (Leitner priority):
 * 1. Fetch UserQuestions where dueDate <= now() and userId = userId
 * 2. Order by: box ASC, dueDate ASC, lastSeenAt ASC
 * 3. Take limit (default 5)
 * 4. If not enough, fetch new template questions
 * 5. Create UserQuestion entries for new questions (Box 1, due now)
 * 6. Return questions + whether more are available
 *
 * INTERVIEW mode (CareerTopic order):
 * 1. Get user's active career track
 * 2. Fetch questions in CareerTopic order
 * 3. Focus on current topic (first N with due questions)
 * 4. Generate new questions for current topic if needed
 * 5. Return questions + topic progress
 *
 * @param userId - User ID
 * @param mode - Session mode (FREE or INTERVIEW)
 * @param sessionId - Session ID (for tracking)
 * @param limit - Number of questions to return (default 5)
 * @returns Due questions and availability flag
 */
export async function fetchDueQuestions(
  userId: string,
  mode: SessionMode = 'FREE',
  sessionId?: string,
  limit: number = 5,
): Promise<FetchDueQuestionsOutput> {
  // INTERVIEW mode: Follow career topic order
  if (mode === 'INTERVIEW') {
    return fetchInterviewModeQuestions(userId, sessionId, limit);
  }

  // FREE mode: Use existing Leitner priority
  return fetchFreeModeQuestions(userId, sessionId, limit);
}

/**
 * Fetch questions for FREE mode (Leitner priority: Box 1 -> 2 -> 3)
 */
async function fetchFreeModeQuestions(
  userId: string,
  sessionId: string | undefined,
  limit: number,
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
 * Fetch questions for INTERVIEW mode (CareerTopic order)
 *
 * Follows the ordered sequence of topics in the user's active career track.
 * Focuses on the current topic (first topic with due questions).
 */
async function fetchInterviewModeQuestions(
  userId: string,
  sessionId: string | undefined,
  limit: number,
): Promise<FetchDueQuestionsOutput> {
  const now = new Date();

  // Get user's active career with topics in order
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
          },
        },
      },
    },
  });

  if (!userCareer) {
    // No active career - fall back to FREE mode behavior
    return fetchFreeModeQuestions(userId, sessionId, limit);
  }

  // Find the first topic with due questions
  let currentTopicOrder = 0;
  let currentTopicIds: string[] = [];
  let currentTopicName = '';
  let totalTopics = userCareer.career.careerTopics.length;

  for (const careerTopic of userCareer.career.careerTopics) {
    currentTopicOrder = careerTopic.order;
    currentTopicIds = [careerTopic.topicId];
    currentTopicName = careerTopic.topic.name;

    // Check if there are due questions for this topic
    const dueCount = await prisma.userQuestion.count({
      where: {
        userId,
        question: {
          topicId: careerTopic.topicId,
        },
        dueDate: {
          lte: now,
        },
      },
    });

    if (dueCount > 0) {
      break; // Found the current topic
    }

    // No due questions for this topic - check if we should generate
    // Generate questions if this is the first topic or if previous topics are "complete"
    const previousTopicsComplete = await arePreviousTopicsComplete(
      userId,
      userCareer.career.id,
      careerTopic.order,
    );

    if (previousTopicsComplete) {
      // This is the active topic - generate questions if needed
      await generateQuestionsForTopic(userId, careerTopic.topicId, 3);
      break;
    }
  }

  // If no topics found, use first topic
  if (currentTopicIds.length === 0 && userCareer.career.careerTopics.length > 0) {
    currentTopicIds = [userCareer.career.careerTopics[0].topicId];
    currentTopicOrder = userCareer.career.careerTopics[0].order;
    currentTopicName = userCareer.career.careerTopics[0].topic.name;
    await generateQuestionsForTopic(userId, currentTopicIds[0], 3);
  }

  // Fetch due questions for the current topic
  const dueUserQuestions = await prisma.userQuestion.findMany({
    where: {
      userId,
      dueDate: { lte: now },
      question: {
        topicId: { in: currentTopicIds },
      },
    },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: [
      { box: 'asc' },
      { dueDate: 'asc' },
      { lastSeenAt: 'asc' },
    ],
    take: limit,
  });

  // If not enough questions, generate more for this topic
  if (dueUserQuestions.length < limit && currentTopicIds.length > 0) {
    const remaining = limit - dueUserQuestions.length;
    await generateQuestionsForTopic(userId, currentTopicIds[0], remaining);

    // Fetch again
    const additionalQuestions = await prisma.userQuestion.findMany({
      where: {
        userId,
        question: {
          topicId: { in: currentTopicIds },
        },
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
        { box: 'asc' },
        { dueDate: 'asc' },
        { lastSeenAt: 'asc' },
      ],
      take: remaining,
    });

    dueUserQuestions.push(...additionalQuestions);
  }

  // Count questions answered for this topic (questions that have been seen at least once)
  const questionsAnswered = await prisma.userQuestion.count({
    where: {
      userId,
      question: {
        topicId: { in: currentTopicIds },
      },
      lastSeenAt: { not: null }, // Has been answered at least once
    },
  });

  // Calculate questions per topic (default to 5 if no specific configuration)
  const questionsPerTopic = 5;

  return {
    questions: mapToDueQuestions(dueUserQuestions),
    hasNewQuestionsAvailable: false, // INTERVIEW mode doesn't use this
    sessionId,
    interviewProgress: {
      currentTopicIndex: currentTopicOrder,
      totalTopics,
      currentTopicName,
      questionsAnswered,
      questionsPerTopic,
    },
  };
}

/**
 * Check if previous topics in the career track are "complete"
 * (have questions in Box 3, meaning mastered)
 */
async function arePreviousTopicsComplete(
  userId: string,
  careerId: string,
  currentOrder: number,
): Promise<boolean> {
  const previousTopics = await prisma.careerTopic.findMany({
    where: {
      careerId,
      order: { lt: currentOrder },
    },
    include: {
      topic: {
        include: {
          questions: {
            include: {
              userQuestions: {
                where: { userId },
              },
            },
          },
        },
      },
    },
  });

  // Consider a topic complete if all its questions are in Box 3
  for (const careerTopic of previousTopics) {
    const userQuestions = careerTopic.topic.questions.flatMap((q) => q.userQuestions);

    if (userQuestions.length === 0) {
      return false; // Haven't started this topic yet
    }

    const allInBox3 = userQuestions.every((uq) => uq.box === 3);
    if (!allInBox3) {
      return false; // Still working on this topic
    }
  }

  return true;
}

/**
 * Generate questions for a specific topic in interview mode
 */
async function generateQuestionsForTopic(
  userId: string,
  topicId: string,
  count: number,
): Promise<void> {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
  });

  if (!topic) {
    return;
  }

  // Get question IDs the user has already seen for this topic
  const seenQuestionIds = (
    await prisma.userQuestion.findMany({
      where: {
        userId,
        question: { topicId },
      },
      select: { questionId: true },
    })
  ).map((uq) => uq.questionId);

  // First try: Fetch template questions for this topic that haven't been seen
  const templateQuestions = await prisma.question.findMany({
    where: {
      topicId,
      isTemplate: true,
      id: { notIn: seenQuestionIds },
    },
    take: count,
  });

  // Create UserQuestion entries for template questions
  if (templateQuestions.length > 0) {
    await prisma.userQuestion.createMany({
      data: templateQuestions.map((q) => ({
        userId,
        questionId: q.id,
        box: 1,
        dueDate: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  // If still need more, generate via LLM
  if (templateQuestions.length < count) {
    const remaining = count - templateQuestions.length;

    try {
      const response = await llmService.generateQuestions({
        topic: topic.name,
        difficulty: topic.difficulty as QuestionDifficulty,
        type: 'CONCEPTUAL' as QuestionType,
        count: remaining,
      });

      for (const q of response.questions) {
        const question = await prisma.question.create({
          data: {
            content: q.content,
            type: q.type,
            difficulty: q.difficulty,
            topicId,
            isTemplate: true,
            createdBy: userId,
            expectedTopics: q.expectedTopics,
            hint: q.hint,
          },
        });

        await prisma.userQuestion.create({
          data: {
            userId,
            questionId: question.id,
            box: 1,
            dueDate: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(`Failed to generate questions for topic ${topic.name}:`, error);
    }
  }
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
