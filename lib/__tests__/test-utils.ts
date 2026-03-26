/**
 * Test utilities for integration tests
 */

import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from '@/lib/config/runtime';

// Create a mock Prisma client for testing
// Uses runtime config if environment variables are not set
export const createMockPrismaClient = () => {
  // Get database URL from runtime config or environment
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    try {
      databaseUrl = getDatabaseUrl();
    } catch {
      // Config not available, tests will fail anyway
    }
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  return prisma;
};

// Clean up test data
export const cleanupTestData = async (prisma: PrismaClient) => {
  // Delete in correct order due to foreign key constraints
  await prisma.answer.deleteMany({});
  await prisma.userQuestion.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.user.deleteMany({});
};

// Create test user
export const createTestUser = async (prisma: PrismaClient, username: string = 'testuser') => {
  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      username,
      password: 'hashedpassword123',
    },
  });
};

// Create test topic
export const createTestTopic = async (prisma: PrismaClient, name: string = 'Test Topic') => {
  return prisma.topic.create({
    data: {
      name,
      category: 'Testing',
      track: 'GENERAL',
      difficulty: 'MID',
      isTemplate: true,
    },
  });
};

// Create test question
export const createTestQuestion = async (prisma: PrismaClient, topicId: string) => {
  return prisma.question.create({
    data: {
      content: 'What is the answer to life, the universe, and everything?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId,
      isTemplate: true,
    },
  });
};
