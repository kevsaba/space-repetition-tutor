/**
 * LeitnerService - Core Spaced Repetition Algorithm
 *
 * Implements the Leitner System with 3 boxes:
 * - Box 1: Review every 1 day (struggling concepts)
 * - Box 2: Review every 3 days (some mastery)
 * - Box 3: Review every 7 days (well-learned)
 *
 * CRITICAL: This is DETERMINISTIC. The LLM NEVER decides box transitions.
 * The backend determines PASS/FAIL using structured LLM result,
 * then applies deterministic rules.
 */

import { addDays } from 'date-fns';

/**
 * Calculate the new box level based on current box and pass/fail result.
 *
 * Rules:
 * - Pass → Promote to next box (max 3)
 * - Fail → Reset to Box 1
 *
 * @param currentBox - Current box level (1, 2, or 3)
 * @param passed - Whether the answer passed evaluation
 * @returns New box level (1, 2, or 3)
 */
export function calculateNewBox(currentBox: number, passed: boolean): number {
  if (passed) {
    // Promote to next box, max is 3
    return Math.min(currentBox + 1, 3);
  }
  // Reset to Box 1 on failure
  return 1;
}

/**
 * Calculate the next due date based on box level.
 *
 * Intervals:
 * - Box 1 → +1 day
 * - Box 2 → +3 days
 * - Box 3 → +7 days
 *
 * @param box - Box level (1, 2, or 3)
 * @returns Next due date
 */
export function calculateNextDueDate(box: number): Date {
  const days = box === 1 ? 1 : box === 2 ? 3 : 7;
  return addDays(new Date(), days);
}

/**
 * Determine if the user should promote to the next box.
 *
 * @param currentBox - Current box level (1, 2, or 3)
 * @param passed - Whether the answer passed evaluation
 * @returns True if should promote, false otherwise
 */
export function shouldPromote(currentBox: number, passed: boolean): boolean {
  return passed && currentBox < 3;
}

/**
 * LeitnerService interface for dependency injection
 */
export const LeitnerService = {
  calculateNewBox,
  calculateNextDueDate,
  shouldPromote,
} as const;

export type LeitnerService = typeof LeitnerService;
