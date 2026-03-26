/**
 * POST /api/questions
 *
 * Manually create a question for the authenticated user.
 *
 * Accepts:
 * - topicName: Name of the topic for the question
 * - questionText: The question text
 * - careerId (optional): ID of career to link the question to
 *
 * Returns: { questionId, topicId, userQuestionId }
 *
 * Process:
 * 1. Validate input
 * 2. Find or create topic (smart matching)
 * 3. Create question with type="UPLOADED"
 * 4. Create UserQuestion record (Box 1, due now)
 * 5. If careerId provided, verify ownership and link topic if needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { CareerError } from '@/lib/services/career.service';

/**
 * Validation constants
 */
const TOPIC_NAME_MIN_LENGTH = 2;
const TOPIC_NAME_MAX_LENGTH = 100;
const QUESTION_TEXT_MIN_LENGTH = 10;
const QUESTION_TEXT_MAX_LENGTH = 1000;

/**
 * Domain error for question creation
 */
class QuestionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'QuestionError';
  }
}

/**
 * POST handler for manual question creation
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticate(request);

    // Parse request body
    const body = await request.json();
    const { topicName, questionText, careerId } = body;

    // Validate topic name
    if (!topicName || typeof topicName !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Topic name is required' } },
        { status: 400 }
      );
    }

    const trimmedTopicName = topicName.trim();

    if (trimmedTopicName.length < TOPIC_NAME_MIN_LENGTH) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: `Topic name must be at least ${TOPIC_NAME_MIN_LENGTH} characters` } },
        { status: 400 }
      );
    }

    if (trimmedTopicName.length > TOPIC_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: `Topic name must not exceed ${TOPIC_NAME_MAX_LENGTH} characters` } },
        { status: 400 }
      );
    }

    // Validate question text
    if (!questionText || typeof questionText !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Question text is required' } },
        { status: 400 }
      );
    }

    const trimmedQuestionText = questionText.trim();

    if (trimmedQuestionText.length < QUESTION_TEXT_MIN_LENGTH) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: `Question text must be at least ${QUESTION_TEXT_MIN_LENGTH} characters` } },
        { status: 400 }
      );
    }

    if (trimmedQuestionText.length > QUESTION_TEXT_MAX_LENGTH) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: `Question text must not exceed ${QUESTION_TEXT_MAX_LENGTH} characters` } },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found. Please log out and sign up again.' } },
        { status: 401 }
      );
    }

    // Verify career ownership if careerId provided
    let career = null;
    if (careerId) {
      career = await prisma.career.findUnique({
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
        return NextResponse.json(
          { error: { code: 'CAREER_NOT_FOUND', message: 'Career not found' } },
          { status: 404 }
        );
      }

      const userCareer = await prisma.userCareer.findFirst({
        where: {
          userId: authResult.userId,
          careerId,
        },
      });

      if (!userCareer) {
        return NextResponse.json(
          { error: { code: 'CAREER_NOT_OWNED', message: 'You do not have permission to add questions to this career' } },
          { status: 403 }
        );
      }
    }

    // Find or create topic (smart matching, similar logic to career.service)
    const topicResult = await findOrCreateTopic(trimmedTopicName, authResult.userId);

    // Create question
    const question = await prisma.question.create({
      data: {
        content: trimmedQuestionText,
        type: 'UPLOADED',
        difficulty: 'MID',
        topicId: topicResult.topicId,
        isTemplate: false,
        createdBy: authResult.userId,
      },
    });

    // Create UserQuestion record (Box 1, due now)
    const userQuestion = await prisma.userQuestion.create({
      data: {
        userId: authResult.userId,
        questionId: question.id,
        box: 1,
        dueDate: new Date(),
        streak: 0,
      },
    });

    // Link topic to career if provided and not already linked
    if (career && topicResult.isNew) {
      const existingTopicIds = new Set(career.careerTopics.map(ct => ct.topicId));

      if (!existingTopicIds.has(topicResult.topicId)) {
        await prisma.careerTopic.create({
          data: {
            careerId,
            topicId: topicResult.topicId,
            order: career.careerTopics.length + 1,
          },
        });
      }
    }

    return NextResponse.json({
      questionId: question.id,
      topicId: topicResult.topicId,
      userQuestionId: userQuestion.id,
      topicName: topicResult.matchedTo || trimmedTopicName,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Log unexpected errors
    console.error('Manual question creation error:', error);

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred while creating the question' } },
      { status: 500 }
    );
  }
}

/**
 * Find or create a topic based on smart matching.
 * Copied from career.service.ts for reuse.
 */
interface TopicMatchResult {
  topicId: string;
  isNew: boolean;
  matchedTo?: string;
}

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
 */
function isFuzzyMatch(name1: string, name2: string): boolean {
  const stopWords = new Set(['the', 'and', 'or', 'for', 'with', 'in', 'at', 'on', 'of']);

  const words1 = name1.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  const words2 = name2.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));

  // Check if one is a substring of the other
  if (name1.includes(name2) || name2.includes(name1)) {
    return true;
  }

  // Check for word overlap
  const smaller = words1.length < words2.length ? words1 : words2;
  const larger = words1.length < words2.length ? words2 : words1;

  const overlapCount = smaller.filter((word) => larger.includes(word)).length;
  const overlapThreshold = Math.max(1, Math.floor(smaller.length * 0.5));

  return overlapCount >= overlapThreshold;
}

/**
 * Infer a category from a topic name.
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
