/**
 * CareerService - Career Track Management
 *
 * Handles career track selection and retrieval for interview mode.
 */

import { prisma } from '../prisma';
import type { PDFParseResult } from './pdf-parser.service';

/**
 * Domain error for career-related operations
 */
export class CareerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CareerError';
  }
}

/**
 * Career with topic count
 */
export interface CareerWithTopicCount {
  id: string;
  name: string;
  description: string;
  topicCount: number;
}

/**
 * Topic with due questions count
 */
export interface TopicWithDueCount {
  id: string;
  name: string;
  category: string;
  order: number;
  questionsDue: number;
}

/**
 * User's active career with topics
 */
export interface ActiveCareerWithTopics {
  id: string;
  name: string;
  description: string;
  startedAt: Date;
  topics: TopicWithDueCount[];
}

/**
 * Get all careers with their topic counts.
 *
 * @returns List of all careers
 */
export async function getAllCareers(): Promise<CareerWithTopicCount[]> {
  const careers = await prisma.career.findMany({
    include: {
      _count: {
        select: { careerTopics: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return careers.map((career) => ({
    id: career.id,
    name: career.name,
    description: career.description,
    topicCount: career._count.careerTopics,
  }));
}

/**
 * Select a career track for a user.
 *
 * Deactivates any previously active career and sets the new one as active.
 *
 * @param userId - User ID
 * @param careerId - Career ID to select
 * @returns UserCareer assignment
 * @throws CareerError if career not found
 */
export async function selectCareer(
  userId: string,
  careerId: string,
): Promise<{ id: string; career: { id: string; name: string }; isActive: boolean; startedAt: Date }> {
  // Verify career exists
  const career = await prisma.career.findUnique({
    where: { id: careerId },
  });

  if (!career) {
    throw new CareerError('Career not found', 'CAREER_NOT_FOUND');
  }

  // Deactivate all existing careers for this user
  await prisma.userCareer.updateMany({
    where: {
      userId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  // Create or activate the new career assignment
  const userCareer = await prisma.userCareer.upsert({
    where: {
      userId_careerId: {
        userId,
        careerId,
      },
    },
    update: {
      isActive: true,
      startedAt: new Date(),
    },
    create: {
      userId,
      careerId,
      isActive: true,
    },
    include: {
      career: true,
    },
  });

  return {
    id: userCareer.id,
    career: {
      id: userCareer.career.id,
      name: userCareer.career.name,
    },
    isActive: userCareer.isActive,
    startedAt: userCareer.startedAt,
  };
}

/**
 * Get the user's active career with topics in order.
 *
 * @param userId - User ID
 * @returns Active career with topics and due question counts
 * @throws CareerError if no active career found
 */
export async function getActiveCareer(userId: string): Promise<ActiveCareerWithTopics> {
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
    throw new CareerError('No active career found', 'NO_ACTIVE_CAREER');
  }

  // Count due questions for each topic
  const now = new Date();
  const topicsWithDueCount: TopicWithDueCount[] = [];

  for (const careerTopic of userCareer.career.careerTopics) {
    // Count UserQuestions for this topic that are due
    const dueCount = await prisma.userQuestion.count({
      where: {
        userId,
        question: {
          topicId: careerTopic.topic.id,
        },
        dueDate: {
          lte: now,
        },
      },
    });

    topicsWithDueCount.push({
      id: careerTopic.topic.id,
      name: careerTopic.topic.name,
      category: careerTopic.topic.category,
      order: careerTopic.order,
      questionsDue: dueCount,
    });
  }

  return {
    id: userCareer.career.id,
    name: userCareer.career.name,
    description: userCareer.career.description,
    startedAt: userCareer.startedAt,
    topics: topicsWithDueCount,
  };
}

/**
 * Result of creating a career from an uploaded PDF
 */
export interface CreateCareerFromUploadResult {
  careerId: string;
  topicsCreated: number;
  questionsAdded: number;
  topicMatches: Array<{
    name: string;
    matched: boolean;
    matchedTo?: string;
  }>;
}

/**
 * Topic match result for smart topic matching
 */
interface TopicMatchResult {
  topicId: string;
  isNew: boolean;
  matchedTo?: string;
}

/**
 * Create a custom career path from an uploaded PDF.
 *
 * This function:
 * 1. Creates a Career record with the user's provided name
 * 2. For each extracted topic:
 *    - Checks if topic already exists in DB (smart topic matching)
 *    - If exists: Uses existing topic, adds questions to it
 *    - If not exists: Creates new topic
 * 3. Creates CareerTopic links for each topic (ordered as they appear)
 * 4. Creates Question records with type="UPLOADED"
 * 5. Marks career as user-created (not a template)
 *
 * Smart Topic Matching Logic:
 * - Exact match first: "Java Concurrency" = "Java Concurrency" ✓
 * - Fuzzy match: "Java language" ≈ "Java" ✓ (keyword overlap)
 * - No match: Create new topic
 *
 * @param userId - User ID creating the career
 * @param careerName - Name provided by user for their career path
 * @param parsedData - Parsed PDF data with topics and questions
 * @returns Created career information with statistics
 * @throws CareerError if creation fails
 */
export async function createFromUpload(
  userId: string,
  careerName: string,
  parsedData: PDFParseResult,
): Promise<CreateCareerFromUploadResult> {
  // Validate input
  if (!careerName || careerName.trim().length === 0) {
    throw new CareerError('Career name is required', 'CAREER_NAME_REQUIRED');
  }

  if (!parsedData.topics || parsedData.topics.length === 0) {
    throw new CareerError('No topics found in uploaded file', 'NO_TOPICS_IN_UPLOAD');
  }

  const totalQuestions = parsedData.topics.reduce((sum, t) => sum + t.questions.length, 0);
  if (totalQuestions === 0) {
    throw new CareerError('No questions found in uploaded file', 'NO_QUESTIONS_IN_UPLOAD');
  }

  // Verify user exists (handles case where user was deleted but token still valid)
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new CareerError('User not found. Please log out and sign up again.', 'USER_NOT_FOUND');
  }

  try {
    console.log('[createFromUpload] Starting career creation for user:', userId, 'careerName:', careerName);
    console.log('[createFromUpload] Parsed data topics:', parsedData.topics.map(t => ({ name: t.name, questions: t.questions.length })));

    // 1. Create the Career record
    const career = await prisma.career.create({
      data: {
        name: careerName.trim(),
        description: `Custom career path created from user upload on ${new Date().toLocaleDateString()}.`,
      },
    });

    const topicMatches: Array<{
      name: string;
      matched: boolean;
      matchedTo?: string;
    }> = [];

    let topicsCreated = 0;
    let questionsAdded = 0;

    // 2. Process each topic
    for (const parsedTopic of parsedData.topics) {
      // Skip topics without questions
      if (parsedTopic.questions.length === 0) {
        continue;
      }

      // Smart topic matching
      const matchResult = await findOrCreateTopic(parsedTopic.name, userId);

      topicMatches.push({
        name: parsedTopic.name,
        matched: !matchResult.isNew,
        matchedTo: matchResult.matchedTo,
      });

      if (matchResult.isNew) {
        topicsCreated++;
      }

      // 3. Create questions for this topic
      const questions = await Promise.all(
        parsedTopic.questions.map((question) =>
          prisma.question.create({
            data: {
              content: question.content.trim(),
              type: 'UPLOADED',
              difficulty: 'MID', // Default to MID for uploaded questions
              topicId: matchResult.topicId,
              isTemplate: false,
              createdBy: userId,
            },
          })
        )
      );

      questionsAdded += questions.length;

      // 3b. Create UserQuestion records for uploaded questions (Box 1, due now)
      // This ensures uploaded questions are immediately available for review
      await Promise.all(
        questions.map((question) =>
          prisma.userQuestion.create({
            data: {
              userId,
              questionId: question.id,
              box: 1,
              dueDate: new Date(), // Due immediately
              streak: 0,
            },
          })
        )
      );
    }

    // 4. Create CareerTopic links in order
    // Use the topic IDs from our matches, in order
    const topicIds: string[] = [];
    for (const parsedTopic of parsedData.topics) {
      if (parsedTopic.questions.length === 0) continue;

      const matchResult = await findOrCreateTopic(parsedTopic.name, userId);
      topicIds.push(matchResult.topicId);
    }

    // Deduplicate topic IDs (in case multiple parsed topics matched to same DB topic)
    const uniqueTopicIds = Array.from(new Set(topicIds));

    await Promise.all(
      uniqueTopicIds.map((topicId, index) =>
        prisma.careerTopic.create({
          data: {
            careerId: career.id,
            topicId,
            order: index + 1,
          },
        })
      )
    );

    // 5. Create UserCareer assignment (make it active)
    // Use upsert in case userCareer already exists but was deactivated
    await prisma.userCareer.upsert({
      where: {
        userId_careerId: {
          userId,
          careerId: career.id,
        },
      },
      update: {
        isActive: true,
        startedAt: new Date(), // Reset start date when reactivating
      },
      create: {
        userId,
        careerId: career.id,
        isActive: true,
      },
    });

    // Deactivate any other active careers for this user
    await prisma.userCareer.updateMany({
      where: {
        userId,
        careerId: { not: career.id },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return {
      careerId: career.id,
      topicsCreated,
      questionsAdded,
      topicMatches,
    };
  } catch (error) {
    if (error instanceof CareerError) {
      throw error;
    }

    // Log detailed error information for debugging
    console.error('Failed to create career from upload. Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error && (error as any).cause ? (error as any).cause : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    });
    throw new CareerError(
      `Failed to create career from uploaded file: ${error instanceof Error ? error.message : String(error)}`,
      'CAREER_CREATE_FAILED'
    );
  }
}

/**
 * Find or create a topic based on smart matching.
 *
 * Matching Logic:
 * 1. Exact match: Compare lowercase, trimmed names
 * 2. Fuzzy match: Check for keyword overlap (e.g., "Java language" matches "Java")
 * 3. No match: Create new topic
 *
 * @param topicName - Name from parsed PDF
 * @param userId - User ID (for created by tracking)
 * @returns Topic match result with ID and whether it was newly created
 */
async function findOrCreateTopic(
  topicName: string,
  userId: string,
): Promise<TopicMatchResult> {
  const normalizedName = topicName.trim().toLowerCase();

  // 1. Try exact match first
  const existingTopic = await prisma.topic.findFirst({
    where: {
      name: {
        equals: topicName.trim(),
        mode: 'insensitive',
      },
    },
  });

  if (existingTopic) {
    return {
      topicId: existingTopic.id,
      isNew: false,
      matchedTo: existingTopic.name,
    };
  }

  // 2. Try fuzzy match (keyword overlap)
  const allTopics = await prisma.topic.findMany({
    select: { id: true, name: true },
  });

  for (const topic of allTopics) {
    if (isFuzzyMatch(normalizedName, topic.name.toLowerCase())) {
      return {
        topicId: topic.id,
        isNew: false,
        matchedTo: topic.name,
      };
    }
  }

  // 3. No match found - create new topic
  const newTopic = await prisma.topic.create({
    data: {
      name: topicName.trim(),
      category: inferCategory(topicName),
      track: inferTrack(topicName),
      difficulty: 'MID',
      isTemplate: false,
    },
  });

  return {
    topicId: newTopic.id,
    isNew: true,
  };
}

/**
 * Check if two topic names are a fuzzy match.
 *
 * A fuzzy match occurs when:
 * - One name is a substring of the other (with min length 3)
 * - They share significant keyword overlap
 *
 * Examples:
 * - "Java Concurrency" ≈ "Java" ✓ (substring)
 * - "REST API Design" ≈ "API Design" ✓ (substring)
 * - "Database Design" ≈ "SQL Database" ✓ (keyword overlap)
 *
 * @param name1 - First topic name (normalized)
 * @param name2 - Second topic name (normalized)
 * @returns True if names are fuzzy match
 */
function isFuzzyMatch(name1: string, name2: string): boolean {
  // Remove common words for comparison
  const stopWords = new Set(['the', 'and', 'or', 'for', 'with', 'in', 'at', 'on', 'of']);

  const words1 = name1.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  const words2 = name2.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));

  // Check if one is a substring of the other
  if (name1.includes(name2) || name2.includes(name1)) {
    return true;
  }

  // Check for word overlap (at least 50% of the smaller set)
  const smaller = words1.length < words2.length ? words1 : words2;
  const larger = words1.length < words2.length ? words2 : words1;

  const overlapCount = smaller.filter((word) => larger.includes(word)).length;
  const overlapThreshold = Math.max(1, Math.floor(smaller.length * 0.5));

  return overlapCount >= overlapThreshold;
}

/**
 * Infer a category from a topic name.
 *
 * @param topicName - Topic name
 * @returns Inferred category
 */
function inferCategory(topicName: string): string {
  const name = topicName.toLowerCase();

  const categoryMap: Record<string, RegExp[]> = {
    'Backend': [/java/, /spring/, /node/, /express/, /api/, /rest/, /graphql/],
    'Database': [/sql/, /database/, /db/, /postgres/, /mysql/, /mongo/, /redis/, /cache/],
    'Distributed Systems': [/distributed/, /microservices/, /kafka/, /message/, /queue/],
    'Frontend': [/react/, /vue/, /angular/, /javascript/, /typescript/, /css/, /html/],
    'DevOps': [/docker/, /kubernetes/, /aws/, /cloud/, /ci\/?cd/, /deploy/],
    'Security': [/security/, /auth/, /oauth/, /jwt/, /encryption/],
  };

  for (const [category, patterns] of Object.entries(categoryMap)) {
    for (const pattern of patterns) {
      if (pattern.test(name)) {
        return category;
      }
    }
  }

  return 'General';
}

/**
 * Infer a track from a topic name.
 *
 * @param topicName - Topic name
 * @returns Inferred track
 */
function inferTrack(topicName: string): 'JAVA' | 'PYTHON' | 'DISTRIBUTED_SYSTEMS' | 'GENERAL' {
  const name = topicName.toLowerCase();

  if (/java|spring|jvm/.test(name)) {
    return 'JAVA';
  }
  if (/python|django|flask|fastapi/.test(name)) {
    return 'PYTHON';
  }
  if (/distributed|microservices|kafka|message|queue/.test(name)) {
    return 'DISTRIBUTED_SYSTEMS';
  }

  return 'GENERAL';
}

/**
 * Result of adding questions to an existing career
 */
export interface AddQuestionsToCareerResult {
  questionsAdded: number;
  topicsCreated: number;
  topicsAdded: number;
}

/**
 * Add questions to an existing career from CSV/Excel upload.
 *
 * This function:
 * 1. Verifies the user owns the career (via UserCareer)
 * 2. For each extracted topic:
 *    - Checks if topic already exists in DB (smart topic matching)
 *    - If exists: Uses existing topic, adds questions to it
 *    - If not exists: Creates new topic
 * 3. Creates CareerTopic links for new topics (if not already linked)
 * 4. Creates Question records with type="UPLOADED"
 * 5. Creates UserQuestion records for the user (Box 1, due now)
 *
 * @param userId - User ID adding the questions
 * @param careerId - Career ID to add questions to
 * @param parsedData - Parsed CSV/Excel data with topics and questions
 * @returns Questions added statistics
 * @throws CareerError if user doesn't own the career or creation fails
 */
export async function addQuestionsToCareer(
  userId: string,
  careerId: string,
  parsedData: PDFParseResult,
): Promise<AddQuestionsToCareerResult> {
  // Validate input
  if (!parsedData.topics || parsedData.topics.length === 0) {
    throw new CareerError('No topics found in uploaded file', 'NO_TOPICS_IN_UPLOAD');
  }

  const totalQuestions = parsedData.topics.reduce((sum, t) => sum + t.questions.length, 0);
  if (totalQuestions === 0) {
    throw new CareerError('No questions found in uploaded file', 'NO_QUESTIONS_IN_UPLOAD');
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new CareerError('User not found. Please log out and sign up again.', 'USER_NOT_FOUND');
  }

  // Verify career exists
  const career = await prisma.career.findUnique({
    where: { id: careerId },
    include: {
      careerTopics: {
        select: {
          topicId: true,
        },
      },
    },
  });

  if (!career) {
    throw new CareerError('Career not found', 'CAREER_NOT_FOUND');
  }

  // Verify user owns this career (via UserCareer)
  const userCareer = await prisma.userCareer.findFirst({
    where: {
      userId,
      careerId,
    },
  });

  if (!userCareer) {
    throw new CareerError('You do not have permission to add questions to this career', 'CAREER_NOT_OWNED');
  }

  try {
    console.log('[addQuestionsToCareer] Starting for user:', userId, 'careerId:', careerId);

    // Get existing topic IDs for this career
    const existingTopicIds = new Set(career.careerTopics.map(ct => ct.topicId));

    const topicMatches: Array<{
      name: string;
      matched: boolean;
      matchedTo?: string;
    }> = [];

    let topicsCreated = 0;
    let topicsAdded = 0;
    let questionsAdded = 0;

    // Process each topic
    for (const parsedTopic of parsedData.topics) {
      // Skip topics without questions
      if (parsedTopic.questions.length === 0) {
        continue;
      }

      // Smart topic matching
      const matchResult = await findOrCreateTopic(parsedTopic.name, userId);

      topicMatches.push({
        name: parsedTopic.name,
        matched: !matchResult.isNew,
        matchedTo: matchResult.matchedTo,
      });

      if (matchResult.isNew) {
        topicsCreated++;
      }

      // Create questions for this topic
      const questions = await Promise.all(
        parsedTopic.questions.map((question) =>
          prisma.question.create({
            data: {
              content: question.content.trim(),
              type: 'UPLOADED',
              difficulty: 'MID',
              topicId: matchResult.topicId,
              isTemplate: false,
              createdBy: userId,
            },
          })
        )
      );

      questionsAdded += questions.length;

      // Create UserQuestion records (Box 1, due now)
      await Promise.all(
        questions.map((question) =>
          prisma.userQuestion.create({
            data: {
              userId,
              questionId: question.id,
              box: 1,
              dueDate: new Date(),
              streak: 0,
            },
          })
        )
      );

      // Add topic to career if not already linked
      if (!existingTopicIds.has(matchResult.topicId)) {
        await prisma.careerTopic.create({
          data: {
            careerId,
            topicId: matchResult.topicId,
            order: career.careerTopics.length + topicsAdded + 1,
          },
        });
        existingTopicIds.add(matchResult.topicId);
        topicsAdded++;
      }
    }

    return {
      questionsAdded,
      topicsCreated,
      topicsAdded,
    };
  } catch (error) {
    if (error instanceof CareerError) {
      throw error;
    }

    console.error('Failed to add questions to career. Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new CareerError(
      `Failed to add questions to career: ${error instanceof Error ? error.message : String(error)}`,
      'ADD_QUESTIONS_FAILED'
    );
  }
}

/**
 * Get user's careers (both template careers they've selected and custom careers they've created).
 *
 * @param userId - User ID
 * @returns List of user's careers with active status
 */
export async function getUserCareers(userId: string): Promise<
  Array<{ id: string; name: string; description: string; isActive: boolean }>
> {
  const userCareers = await prisma.userCareer.findMany({
    where: { userId },
    include: {
      career: true,
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  return userCareers.map((uc) => ({
    id: uc.career.id,
    name: uc.career.name,
    description: uc.career.description || '',
    isActive: uc.isActive,
  }));
}

/**
 * CareerService interface for dependency injection
 */
export const CareerService = {
  getAllCareers,
  getUserCareers,
  selectCareer,
  getActiveCareer,
  createFromUpload,
  addQuestionsToCareer,
} as const;

export type CareerService = typeof CareerService;
