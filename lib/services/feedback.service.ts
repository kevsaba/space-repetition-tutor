/**
 * Feedback Service
 *
 * Aggregates user ratings to build steering context for LLM.
 * This enables the LLM to adapt to user preferences over time.
 */

import { prisma } from '@/lib/prisma';
import type { LLMFeedback } from './llm/types';

/**
 * User feedback profile for LLM steering
 */
export interface UserFeedbackProfile {
  preferredDifficulty: 'EASIER' | 'SAME' | 'HARDER' | null;
  preferredFeedbackStyle: 'SIMPLER' | 'SAME' | 'DETAILED' | null;
  totalRatings: number;
  questionThumbsUpCount: number;
  questionThumbsDownCount: number;
  feedbackThumbsUpCount: number;
  feedbackThumbsDownCount: number;
}

/**
 * Get user's feedback profile for LLM steering
 *
 * Analyzes recent user ratings to determine preferences.
 * Only considers the last 20 ratings to ensure responsiveness to changing preferences.
 *
 * @param userId - The user ID to fetch feedback for
 * @returns User's feedback profile
 */
export async function getUserFeedbackProfile(userId: string): Promise<UserFeedbackProfile> {
  // Fetch last 20 answers with ratings for this user
  const recentAnswers = await prisma.answer.findMany({
    where: {
      userQuestion: {
        userId,
      },
      OR: [
        { questionRating: { not: null } },
        { feedbackRating: { not: null } },
      ],
    },
    orderBy: {
      answeredAt: 'desc',
    },
    take: 20,
  });

  if (recentAnswers.length === 0) {
    return {
      preferredDifficulty: null,
      preferredFeedbackStyle: null,
      totalRatings: 0,
      questionThumbsUpCount: 0,
      questionThumbsDownCount: 0,
      feedbackThumbsUpCount: 0,
      feedbackThumbsDownCount: 0,
    };
  }

  // Count ratings
  let questionThumbsUp = 0;
  let questionThumbsDown = 0;
  let feedbackThumbsUp = 0;
  let feedbackThumbsDown = 0;

  for (const answer of recentAnswers) {
    if (answer.questionRating === 'THUMBS_UP') questionThumbsUp++;
    if (answer.questionRating === 'THUMBS_DOWN') questionThumbsDown++;
    if (answer.feedbackRating === 'THUMBS_UP') feedbackThumbsUp++;
    if (answer.feedbackRating === 'THUMBS_DOWN') feedbackThumbsDown++;
  }

  // Determine preferences based on recent ratings
  let preferredDifficulty: UserFeedbackProfile['preferredDifficulty'] = null;
  let preferredFeedbackStyle: UserFeedbackProfile['preferredFeedbackStyle'] = null;

  // For difficulty: need at least 5 question ratings to make a determination
  const totalQuestionRatings = questionThumbsUp + questionThumbsDown;
  if (totalQuestionRatings >= 5) {
    const thumbsUpRatio = questionThumbsUp / totalQuestionRatings;
    if (thumbsUpRatio >= 0.7) {
      preferredDifficulty = 'SAME'; // User is happy, keep same level
    } else if (thumbsUpRatio <= 0.3) {
      preferredDifficulty = 'EASIER'; // User is struggling, suggest easier
    } else {
      preferredDifficulty = 'SAME'; // Mixed feedback, stay neutral
    }
  }

  // For feedback style: need at least 5 feedback ratings to make a determination
  const totalFeedbackRatings = feedbackThumbsUp + feedbackThumbsDown;
  if (totalFeedbackRatings >= 5) {
    const thumbsUpRatio = feedbackThumbsUp / totalFeedbackRatings;
    if (thumbsUpRatio >= 0.7) {
      preferredFeedbackStyle = 'SAME'; // User likes current style
    } else if (thumbsUpRatio <= 0.3) {
      preferredFeedbackStyle = 'SIMPLER'; // User finds feedback too complex
    } else {
      preferredFeedbackStyle = 'SAME'; // Mixed feedback
    }
  }

  return {
    preferredDifficulty,
    preferredFeedbackStyle,
    totalRatings: recentAnswers.length,
    questionThumbsUpCount: questionThumbsUp,
    questionThumbsDownCount: questionThumbsDown,
    feedbackThumbsUpCount: feedbackThumbsUp,
    feedbackThumbsDownCount: feedbackThumbsDown,
  };
}

/**
 * Build steering context for question generation
 *
 * Creates a prompt section that guides the LLM to generate questions
 * aligned with the user's demonstrated preferences.
 *
 * @param userId - The user ID to build steering context for
 * @returns Steering context string to include in prompt, or empty string if insufficient data
 */
export async function buildQuestionSteeringContext(userId: string): Promise<string> {
  const profile = await getUserFeedbackProfile(userId);

  // Need at least 5 question ratings to provide meaningful steering
  if (profile.totalRatings < 5 || profile.questionThumbsUpCount + profile.questionThumbsDownCount < 5) {
    return '';
  }

  const parts: string[] = ['USER PREFERENCES:'];

  if (profile.preferredDifficulty === 'EASIER') {
    parts.push('The user has found recent questions too challenging. Focus on:');
    parts.push('- Core concepts before diving deep');
    parts.push('- Practical examples over theoretical depth');
    parts.push('- Clearer, more direct questions');
  } else if (profile.preferredDifficulty === 'SAME' && profile.questionThumbsUpCount >= 5) {
    parts.push('The user has responded well to recent question difficulty. Maintain this level.');
  }

  if (parts.length === 1) {
    return ''; // No meaningful preferences to add
  }

  return parts.join('\n');
}

/**
 * Build steering context for answer evaluation
 *
 * Creates a prompt section that guides the LLM to provide feedback
 * in a style that the user has demonstrated they prefer.
 * Also includes reference examples from highly-rated feedback.
 *
 * @param userId - The user ID to build steering context for
 * @returns Steering context string to include in prompt, or empty string if insufficient data
 */
export async function buildFeedbackSteeringContext(userId: string): Promise<string> {
  const profile = await getUserFeedbackProfile(userId);

  // Need at least 5 feedback ratings to provide meaningful steering
  if (profile.totalRatings < 5 || profile.feedbackThumbsUpCount + profile.feedbackThumbsDownCount < 5) {
    return '';
  }

  const parts: string[] = [];

  // Add style guidance based on feedback ratings
  if (profile.preferredFeedbackStyle === 'SIMPLER') {
    parts.push('USER PREFERENCES:');
    parts.push('The user has found recent feedback too detailed or complex. Adjust your style:');
    parts.push('- Use simpler language and shorter sentences');
    parts.push('- Focus on 1-2 key points rather than exhaustive detail');
    parts.push('- Avoid jargon unless explaining it clearly');
  } else if (profile.preferredFeedbackStyle === 'SAME' && profile.feedbackThumbsUpCount >= 5) {
    parts.push('USER PREFERENCES:');
    parts.push('The user has responded well to recent feedback style. Maintain this approach.');
  }

  // Fetch top-rated feedback examples as reference
  if (profile.feedbackThumbsUpCount >= 2) {
    const topRatedAnswers = await prisma.answer.findMany({
      where: {
        userQuestion: { userId },
        feedbackRating: 'THUMBS_UP',
      },
      orderBy: {
        answeredAt: 'desc',
      },
      take: 2,
      select: {
        feedback: true,
      },
    });

    if (topRatedAnswers.length > 0) {
      parts.push('\nREFERENCE EXAMPLES (feedback the user found helpful):');

      topRatedAnswers.forEach((answer, index) => {
        const feedback = answer.feedback as unknown as LLMFeedback;
        parts.push(`\nExample ${index + 1}:`);
        if (feedback.evaluation) {
          parts.push(`- Evaluation style: "${feedback.evaluation.substring(0, 100)}..."`);
        }
        if (feedback.analogy && feedback.analogy !== 'N/A') {
          parts.push(`- Used analogy: ${feedback.analogy.substring(0, 80)}...`);
        }
      });

      parts.push('\nTry to emulate aspects of this style that resonate with the user.');
    }
  }

  return parts.join('\n');
}

/**
 * FeedbackService interface for dependency injection
 */
export const FeedbackService = {
  getUserFeedbackProfile,
  buildQuestionSteeringContext,
  buildFeedbackSteeringContext,
} as const;

export type FeedbackServiceType = typeof FeedbackService;
