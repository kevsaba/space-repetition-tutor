/**
 * StatsService - User Statistics and Dashboard Data
 *
 * Provides statistics for the dashboard including:
 * - Box distribution (Leitner system boxes 1, 2, 3)
 * - Total questions answered
 * - Questions answered today
 * - Current streak
 */

import { prisma } from '../prisma';

/**
 * Box distribution stats (object format)
 */
export interface BoxDistribution {
  box1: number;
  box2: number;
  box3: number;
}

/**
 * Box distribution stat item (array format for frontend)
 */
export interface BoxDistributionItem {
  box: number;
  count: number;
}

/**
 * User statistics for dashboard
 */
export interface UserStats {
  boxDistribution: BoxDistribution;
  boxDistributionArray: BoxDistributionItem[];
  totalQuestions: number;
  answeredToday: number;
  dueToday: number;
  currentStreak: number;
}

/**
 * Calculate the current streak based on consecutive days with activity.
 *
 * A streak is maintained if the user answered at least one question
 * on consecutive days. The streak resets if a day is missed.
 *
 * @param userId - User ID
 * @returns Current streak (number of consecutive days with activity)
 */
async function calculateCurrentStreak(userId: string): Promise<number> {
  // Get all answers for this user, ordered by date (newest first)
  const answers = await prisma.answer.findMany({
    where: {
      userQuestion: {
        userId,
      },
    },
    orderBy: {
      answeredAt: 'desc',
    },
    select: {
      answeredAt: true,
    },
    take: 365, // Look back up to a year
  });

  if (answers.length === 0) {
    return 0;
  }

  // Group answers by day (UTC)
  const daysWithActivity = new Set<string>();
  const now = new Date();

  for (const answer of answers) {
    const answerDate = new Date(answer.answeredAt);
    // Normalize to UTC midnight
    const dayKey = `${answerDate.getUTCFullYear()}-${answerDate.getUTCMonth()}-${answerDate.getUTCDate()}`;
    daysWithActivity.add(dayKey);
  }

  // Convert to sorted array (newest first)
  const sortedDays = Array.from(daysWithActivity).sort().reverse();

  // Check if there's activity today or yesterday to start counting
  let streak = 0;
  const currentDate = new Date(now);
  currentDate.setUTCHours(0, 0, 0, 0);

  // Check for today's activity
  const todayKeyCheck = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()}-${currentDate.getUTCDate()}`;
  if (sortedDays.includes(todayKeyCheck)) {
    streak = 1;
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  } else {
    // No activity today, check if yesterday has activity
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    const yesterdayKey = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()}-${currentDate.getUTCDate()}`;
    if (!sortedDays.includes(yesterdayKey)) {
      return 0; // Streak broken - no activity today or yesterday
    }
    streak = 1;
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  }

  // Count backwards for consecutive days
  while (true) {
    const dayKey = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()}-${currentDate.getUTCDate()}`;
    if (sortedDays.includes(dayKey)) {
      streak++;
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Count questions due today.
 *
 * @param userId - User ID
 * @returns Number of questions due today
 */
async function countDueToday(userId: string): Promise<number> {
  const now = new Date();

  // End of today in UTC
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // Count questions due today or earlier
  const dueToday = await prisma.userQuestion.count({
    where: {
      userId,
      dueDate: {
        lte: endOfDay,
      },
    },
  });

  return dueToday;
}

/**
 * Count questions answered today (UTC).
 *
 * @param userId - User ID
 * @returns Number of questions answered today
 */
async function countAnsweredToday(userId: string): Promise<number> {
  const now = new Date();

  // Start of today in UTC
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  // Count unique questions answered today
  const answeredToday = await prisma.userQuestion.count({
    where: {
      userId,
      lastSeenAt: {
        gte: startOfDay,
      },
    },
  });

  return answeredToday;
}

/**
 * Get box distribution for a user.
 *
 * Counts UserQuestions per box (1, 2, 3) for the given user.
 *
 * @param userId - User ID
 * @returns Box distribution
 */
async function getBoxDistribution(userId: string): Promise<BoxDistribution> {
  // Count questions in each box
  const boxCounts = await prisma.userQuestion.groupBy({
    by: ['box'],
    where: {
      userId,
    },
    _count: {
      box: true,
    },
  });

  // Initialize with zeros
  const distribution: BoxDistribution = {
    box1: 0,
    box2: 0,
    box3: 0,
  };

  // Map groupBy results to distribution
  for (const item of boxCounts) {
    if (item.box === 1) {
      distribution.box1 = item._count.box;
    } else if (item.box === 2) {
      distribution.box2 = item._count.box;
    } else if (item.box === 3) {
      distribution.box3 = item._count.box;
    }
  }

  return distribution;
}

/**
 * Get total number of questions answered by the user.
 *
 * A question is considered "answered" if lastSeenAt is not null.
 *
 * @param userId - User ID
 * @returns Total number of questions answered
 */
async function getTotalQuestionsAnswered(userId: string): Promise<number> {
  return prisma.userQuestion.count({
    where: {
      userId,
      lastSeenAt: {
        not: null,
      },
    },
  });
}

/**
 * Get complete user statistics for the dashboard.
 *
 * This is the main entry point for the stats service.
 * It aggregates all statistics in a single query-efficient call.
 *
 * @param userId - User ID
 * @returns Complete user statistics
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  // Run independent queries in parallel for better performance
  const [boxDistribution, totalQuestions, answeredToday, dueToday, currentStreak] = await Promise.all([
    getBoxDistribution(userId),
    getTotalQuestionsAnswered(userId),
    countAnsweredToday(userId),
    countDueToday(userId),
    calculateCurrentStreak(userId),
  ]);

  // Create array format for frontend
  const boxDistributionArray: BoxDistributionItem[] = [
    { box: 1, count: boxDistribution.box1 },
    { box: 2, count: boxDistribution.box2 },
    { box: 3, count: boxDistribution.box3 },
  ];

  return {
    boxDistribution,
    boxDistributionArray,
    totalQuestions,
    answeredToday,
    dueToday,
    currentStreak,
  };
}

/**
 * StatsService interface for dependency injection
 */
export const StatsService = {
  getUserStats,
  getBoxDistribution,
  getTotalQuestionsAnswered,
  countAnsweredToday,
  countDueToday,
  calculateCurrentStreak,
} as const;

export type StatsService = typeof StatsService;
