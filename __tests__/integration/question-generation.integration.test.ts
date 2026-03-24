/**
 * Question Generation Integration Test
 *
 * Verifies that questions are properly fetched from template pool
 * and generated via LLM when needed.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { QuestionService } from '@/lib/services/question.service';
import { prisma } from '@/lib/prisma';

describe('Question Generation Integration', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('testpass', 10);

    const user = await prisma.user.create({
      data: {
        username: `testuser_${Date.now()}`,
        password: hashedPassword,
      },
    });

    testUserId = user.id;
  });

  it('should fetch template questions when no due questions exist', async () => {
    const result = await QuestionService.fetchDueQuestions(testUserId, undefined, 5);

    expect(result.questions).toBeDefined();
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeLessThanOrEqual(5);

    // Verify first question has expected structure
    const firstQuestion = result.questions[0];
    expect(firstQuestion).toHaveProperty('id');
    expect(firstQuestion).toHaveProperty('content');
    expect(firstQuestion).toHaveProperty('topic');
    expect(firstQuestion).toHaveProperty('box');
    expect(firstQuestion).toHaveProperty('timesSeen');
    expect(firstQuestion).toHaveProperty('isNew');
  });

  it('should create UserQuestion records for new questions', async () => {
    // First call should create UserQuestion records
    const result1 = await QuestionService.fetchDueQuestions(testUserId, undefined, 3);
    expect(result1.questions.length).toBeGreaterThan(0);

    // Verify UserQuestion records were created
    const userQuestions = await prisma.userQuestion.findMany({
      where: { userId: testUserId },
      include: { question: true },
    });

    expect(userQuestions.length).toBeGreaterThan(0);

    // All fetched questions should be marked as new (first time seen)
    const newQuestions = result1.questions.filter((q) => q.isNew);
    expect(newQuestions.length).toBe(result1.questions.length);
  });

  it('should return hasNewQuestionsAvailable correctly', async () => {
    const result = await QuestionService.fetchDueQuestions(testUserId, undefined, 100);

    // hasNewQuestionsAvailable should indicate if more templates exist
    expect(typeof result.hasNewQuestionsAvailable).toBe('boolean');
  }, 30000); // Increase timeout for LLM retry attempts

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });
});
