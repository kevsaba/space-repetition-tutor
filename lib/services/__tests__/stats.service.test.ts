/**
 * Unit tests for StatsService
 *
 * Tests user statistics and dashboard data:
 * - getBoxDistribution() - Box counts (Leitner system boxes 1, 2, 3)
 * - countAnsweredToday() - Questions answered today (UTC)
 * - countDueToday() - Questions due today or earlier
 * - calculateCurrentStreak() - Consecutive days with activity
 * - getUserStats() - Aggregates all stats
 */

import { getUserStats, StatsService } from '../stats.service';
import { prisma } from '../../prisma';

// Mock Prisma client
jest.mock('../../prisma', () => ({
  prisma: {
    userQuestion: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    answer: {
      findMany: jest.fn(),
    },
  },
}));

describe('StatsService', () => {
  const mockUserId = 'user-stats-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBoxDistribution', () => {
    it('should return correct counts for each box', async () => {
      const mockBoxCounts = [
        { box: 1, _count: { box: 5 } },
        { box: 2, _count: { box: 3 } },
        { box: 3, _count: { box: 7 } },
      ];

      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue(mockBoxCounts);

      const result = await StatsService.getBoxDistribution(mockUserId);

      expect(result).toEqual({
        box1: 5,
        box2: 3,
        box3: 7,
      });

      expect(prisma.userQuestion.groupBy).toHaveBeenCalledWith({
        by: ['box'],
        where: { userId: mockUserId },
        _count: { box: true },
      });
    });

    it('should return zeros when no questions exist', async () => {
      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await StatsService.getBoxDistribution(mockUserId);

      expect(result).toEqual({
        box1: 0,
        box2: 0,
        box3: 0,
      });
    });

    it('should group by box correctly with only Box 1 questions', async () => {
      const mockBoxCounts = [
        { box: 1, _count: { box: 10 } },
      ];

      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue(mockBoxCounts);

      const result = await StatsService.getBoxDistribution(mockUserId);

      expect(result).toEqual({
        box1: 10,
        box2: 0,
        box3: 0,
      });
    });

    it('should group by box correctly with only Box 2 questions', async () => {
      const mockBoxCounts = [
        { box: 2, _count: { box: 8 } },
      ];

      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue(mockBoxCounts);

      const result = await StatsService.getBoxDistribution(mockUserId);

      expect(result).toEqual({
        box1: 0,
        box2: 8,
        box3: 0,
      });
    });

    it('should group by box correctly with only Box 3 questions', async () => {
      const mockBoxCounts = [
        { box: 3, _count: { box: 15 } },
      ];

      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue(mockBoxCounts);

      const result = await StatsService.getBoxDistribution(mockUserId);

      expect(result).toEqual({
        box1: 0,
        box2: 0,
        box3: 15,
      });
    });

    it('should handle partial box distribution (missing boxes)', async () => {
      const mockBoxCounts = [
        { box: 1, _count: { box: 4 } },
        { box: 3, _count: { box: 6 } },
        // Box 2 missing
      ];

      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue(mockBoxCounts);

      const result = await StatsService.getBoxDistribution(mockUserId);

      expect(result).toEqual({
        box1: 4,
        box2: 0,
        box3: 6,
      });
    });
  });

  describe('countAnsweredToday', () => {
    beforeEach(() => {
      // Mock current date to ensure consistent tests (UTC)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-25T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should count questions answered today (UTC)', async () => {
      const mockCount = 5;
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(mockCount);

      const result = await StatsService.countAnsweredToday(mockUserId);

      expect(result).toBe(5);

      expect(prisma.userQuestion.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          lastSeenAt: {
            gte: new Date('2025-03-25T00:00:00Z'),
          },
        },
      });
    });

    it('should return 0 when no questions answered today', async () => {
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(0);

      const result = await StatsService.countAnsweredToday(mockUserId);

      expect(result).toBe(0);
    });

    it('should handle date boundaries correctly', async () => {
      // Test at end of day
      jest.setSystemTime(new Date('2025-03-25T23:59:59Z'));

      const mockCount = 3;
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(mockCount);

      const result = await StatsService.countAnsweredToday(mockUserId);

      expect(result).toBe(3);

      expect(prisma.userQuestion.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          lastSeenAt: {
            gte: new Date('2025-03-25T00:00:00Z'),
          },
        },
      });
    });

    it('should handle midnight UTC correctly', async () => {
      // Test at start of day
      jest.setSystemTime(new Date('2025-03-25T00:00:00Z'));

      const mockCount = 1;
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(mockCount);

      const result = await StatsService.countAnsweredToday(mockUserId);

      expect(result).toBe(1);
    });
  });

  describe('countDueToday', () => {
    beforeEach(() => {
      // Mock current date to ensure consistent tests (UTC)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-25T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should count questions due today or earlier', async () => {
      const mockCount = 7;
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(mockCount);

      const result = await StatsService.countDueToday(mockUserId);

      expect(result).toBe(7);

      expect(prisma.userQuestion.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          dueDate: {
            lte: new Date('2025-03-25T23:59:59.999Z'),
          },
        },
      });
    });

    it('should return 0 when no questions due', async () => {
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(0);

      const result = await StatsService.countDueToday(mockUserId);

      expect(result).toBe(0);
    });

    it('should handle date boundaries correctly', async () => {
      // Test at start of day
      jest.setSystemTime(new Date('2025-03-25T00:00:00Z'));

      const mockCount = 4;
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(mockCount);

      const result = await StatsService.countDueToday(mockUserId);

      expect(result).toBe(4);

      expect(prisma.userQuestion.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          dueDate: {
            lte: new Date('2025-03-25T23:59:59.999Z'),
          },
        },
      });
    });

    it('should include questions due in the past', async () => {
      const mockCount = 10;
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(mockCount);

      const result = await StatsService.countDueToday(mockUserId);

      expect(result).toBe(10);
    });
  });

  describe('calculateCurrentStreak', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-25T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 0 when no activity', async () => {
      (prisma.answer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(0);
    });

    it('should return 1 when only activity today', async () => {
      const mockAnswers = [
        { answeredAt: new Date('2025-03-25T10:00:00Z') },
        { answeredAt: new Date('2025-03-25T11:00:00Z') },
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(1);
    });

    it('should return 1 when only activity yesterday (streak still active)', async () => {
      const mockAnswers = [
        { answeredAt: new Date('2025-03-24T10:00:00Z') },
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(1);
    });

    it('should calculate consecutive days correctly', async () => {
      const mockAnswers = [
        { answeredAt: new Date('2025-03-25T10:00:00Z') }, // Today
        { answeredAt: new Date('2025-03-24T15:00:00Z') }, // Yesterday
        { answeredAt: new Date('2025-03-23T08:00:00Z') }, // 2 days ago
        { answeredAt: new Date('2025-03-22T12:00:00Z') }, // 3 days ago
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(4);
    });

    it('should reset streak when day is missed', async () => {
      const mockAnswers = [
        { answeredAt: new Date('2025-03-25T10:00:00Z') }, // Today
        { answeredAt: new Date('2025-03-23T08:00:00Z') }, // 2 days ago (gap yesterday)
        { answeredAt: new Date('2025-03-22T12:00:00Z') }, // 3 days ago
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(1);
    });

    it('should return 0 when streak broken (no activity today or yesterday)', async () => {
      const mockAnswers = [
        { answeredAt: new Date('2025-03-23T10:00:00Z') }, // 2 days ago
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(0);
    });

    it('should handle month boundaries correctly', async () => {
      jest.setSystemTime(new Date('2025-04-01T12:00:00Z'));

      const mockAnswers = [
        { answeredAt: new Date('2025-04-01T10:00:00Z') }, // Today (April 1)
        { answeredAt: new Date('2025-03-31T15:00:00Z') }, // Yesterday (March 31)
        { answeredAt: new Date('2025-03-30T08:00:00Z') }, // 2 days ago (March 30)
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(3);
    });

    it('should handle year boundaries correctly', async () => {
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));

      const mockAnswers = [
        { answeredAt: new Date('2025-01-01T10:00:00Z') }, // Today (Jan 1, 2025)
        { answeredAt: new Date('2024-12-31T15:00:00Z') }, // Yesterday (Dec 31, 2024)
        { answeredAt: new Date('2024-12-30T08:00:00Z') }, // 2 days ago (Dec 30, 2024)
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(3);
    });

    it('should count multiple answers on same day as single streak day', async () => {
      const mockAnswers = [
        { answeredAt: new Date('2025-03-25T08:00:00Z') },
        { answeredAt: new Date('2025-03-25T10:00:00Z') },
        { answeredAt: new Date('2025-03-25T14:00:00Z') },
        { answeredAt: new Date('2025-03-25T18:00:00Z') },
        { answeredAt: new Date('2025-03-24T09:00:00Z') },
        { answeredAt: new Date('2025-03-24T16:00:00Z') },
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(2); // 2 unique days with activity
    });

    it('should handle long streaks correctly', async () => {
      const mockAnswers: Array<{ answeredAt: Date }> = [];
      const startDate = new Date('2025-03-01T12:00:00Z');

      // Generate 25 days of consecutive activity
      for (let i = 0; i < 25; i++) {
        const date = new Date(startDate);
        date.setUTCDate(date.getUTCDate() + i);
        mockAnswers.push({ answeredAt: new Date(date) });
      }

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(25);
    });

    it('should use UTC for day calculations', async () => {
      // Test with times that would be different days in local time but same in UTC
      jest.setSystemTime(new Date('2025-03-25T00:00:00Z'));

      const mockAnswers = [
        { answeredAt: new Date('2025-03-25T00:30:00Z') }, // Just after midnight UTC
        { answeredAt: new Date('2025-03-24T23:30:00Z') }, // Just before midnight UTC (yesterday)
      ];

      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await StatsService.calculateCurrentStreak(mockUserId);

      expect(result).toBe(2);
    });
  });

  describe('getTotalQuestionsAnswered', () => {
    it('should count total questions answered', async () => {
      const mockCount = 42;
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(mockCount);

      const result = await StatsService.getTotalQuestionsAnswered(mockUserId);

      expect(result).toBe(42);

      expect(prisma.userQuestion.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          lastSeenAt: {
            not: null,
          },
        },
      });
    });

    it('should return 0 when no questions answered', async () => {
      (prisma.userQuestion.count as jest.Mock).mockResolvedValue(0);

      const result = await StatsService.getTotalQuestionsAnswered(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('getUserStats', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-25T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should aggregate all stats correctly', async () => {
      // Mock all the underlying calls
      const mockBoxCounts = [
        { box: 1, _count: { box: 5 } },
        { box: 2, _count: { box: 3 } },
        { box: 3, _count: { box: 7 } },
      ];
      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue(mockBoxCounts);

      (prisma.userQuestion.count as jest.Mock)
        .mockResolvedValueOnce(15) // getTotalQuestionsAnswered
        .mockResolvedValueOnce(5)  // countAnsweredToday
        .mockResolvedValueOnce(7); // countDueToday

      const mockAnswers = [
        { answeredAt: new Date('2025-03-25T10:00:00Z') },
        { answeredAt: new Date('2025-03-24T15:00:00Z') },
        { answeredAt: new Date('2025-03-23T08:00:00Z') },
      ];
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await getUserStats(mockUserId);

      expect(result).toEqual({
        boxDistribution: {
          box1: 5,
          box2: 3,
          box3: 7,
        },
        boxDistributionArray: [
          { box: 1, count: 5 },
          { box: 2, count: 3 },
          { box: 3, count: 7 },
        ],
        totalQuestions: 15,
        answeredToday: 5,
        dueToday: 7,
        currentStreak: 3,
      });

      // Verify all queries were made
      expect(prisma.userQuestion.groupBy).toHaveBeenCalled();
      expect(prisma.userQuestion.count).toHaveBeenCalledTimes(3);
      expect(prisma.answer.findMany).toHaveBeenCalled();
    });

    it('should handle new user with no activity', async () => {
      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue([]);

      (prisma.userQuestion.count as jest.Mock)
        .mockResolvedValueOnce(0) // getTotalQuestionsAnswered
        .mockResolvedValueOnce(0) // countAnsweredToday
        .mockResolvedValueOnce(0); // countDueToday

      (prisma.answer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUserStats(mockUserId);

      expect(result).toEqual({
        boxDistribution: {
          box1: 0,
          box2: 0,
          box3: 0,
        },
        boxDistributionArray: [
          { box: 1, count: 0 },
          { box: 2, count: 0 },
          { box: 3, count: 0 },
        ],
        totalQuestions: 0,
        answeredToday: 0,
        dueToday: 0,
        currentStreak: 0,
      });
    });

    it('should create boxDistributionArray in correct order', async () => {
      const mockBoxCounts = [
        { box: 3, _count: { box: 10 } },
        { box: 1, _count: { box: 5 } },
        { box: 2, _count: { box: 3 } },
      ];
      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue(mockBoxCounts);

      (prisma.userQuestion.count as jest.Mock)
        .mockResolvedValueOnce(18)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      (prisma.answer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUserStats(mockUserId);

      // Array should always be in box order 1, 2, 3
      expect(result.boxDistributionArray).toEqual([
        { box: 1, count: 5 },
        { box: 2, count: 3 },
        { box: 3, count: 10 },
      ]);
    });

    it('should run queries in parallel for performance', async () => {
      const mockBoxCounts = [
        { box: 1, _count: { box: 1 } },
      ];
      (prisma.userQuestion.groupBy as jest.Mock).mockResolvedValue(mockBoxCounts);

      (prisma.userQuestion.count as jest.Mock)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const mockAnswers = [{ answeredAt: new Date('2025-03-25T10:00:00Z') }];
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const startTime = Date.now();
      await getUserStats(mockUserId);
      const endTime = Date.now();

      // Should complete quickly due to parallel queries
      // (This is a rough check; in practice would need more sophisticated timing test)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
