/**
 * Unit tests for LeitnerService
 *
 * Tests the core Leitner algorithm:
 * - Box transition logic (deterministic)
 * - Due date calculation
 * - Promotion logic
 */

import { calculateNewBox, calculateNextDueDate, shouldPromote } from '../leitner.service';

describe('LeitnerService', () => {
  describe('calculateNewBox', () => {
    it('should promote from Box 1 to Box 2 on pass', () => {
      const result = calculateNewBox(1, true);
      expect(result).toBe(2);
    });

    it('should promote from Box 2 to Box 3 on pass', () => {
      const result = calculateNewBox(2, true);
      expect(result).toBe(3);
    });

    it('should maintain Box 3 on pass (max level)', () => {
      const result = calculateNewBox(3, true);
      expect(result).toBe(3);
    });

    it('should reset to Box 1 on fail from any box', () => {
      expect(calculateNewBox(1, false)).toBe(1);
      expect(calculateNewBox(2, false)).toBe(1);
      expect(calculateNewBox(3, false)).toBe(1);
    });

    it('should handle edge cases', () => {
      // Box at max level, pass should stay at max
      expect(calculateNewBox(3, true)).toBe(3);

      // Any failure should go to Box 1
      expect(calculateNewBox(3, false)).toBe(1);
    });
  });

  describe('calculateNextDueDate', () => {
    beforeEach(() => {
      // Mock current date to ensure consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-23T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate Box 1 due date as +1 day', () => {
      const result = calculateNextDueDate(1);
      const expected = new Date('2025-03-24T00:00:00Z');
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should calculate Box 2 due date as +3 days', () => {
      const result = calculateNextDueDate(2);
      const expected = new Date('2025-03-26T00:00:00Z');
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should calculate Box 3 due date as +7 days', () => {
      const result = calculateNextDueDate(3);
      const expected = new Date('2025-03-30T00:00:00Z');
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle month boundaries correctly', () => {
      jest.setSystemTime(new Date('2025-03-31T00:00:00Z'));

      // Box 1: March 31 + 1 day = April 1
      const box1Result = calculateNextDueDate(1);
      expect(box1Result.toISOString()).toBe(new Date('2025-04-01T00:00:00Z').toISOString());

      // Box 3: March 31 + 7 days = April 7
      const box3Result = calculateNextDueDate(3);
      expect(box3Result.toISOString()).toBe(new Date('2025-04-07T00:00:00Z').toISOString());
    });

    it('should handle leap years correctly', () => {
      jest.setSystemTime(new Date('2024-02-28T00:00:00Z')); // 2024 is a leap year

      const result = calculateNextDueDate(1); // +1 day
      expect(result.toISOString()).toBe(new Date('2024-02-29T00:00:00Z').toISOString());
    });

    it('should handle non-leap years correctly', () => {
      jest.setSystemTime(new Date('2025-02-28T00:00:00Z')); // 2025 is not a leap year

      const result = calculateNextDueDate(1); // +1 day
      expect(result.toISOString()).toBe(new Date('2025-03-01T00:00:00Z').toISOString());
    });
  });

  describe('shouldPromote', () => {
    it('should return true when passing and below Box 3', () => {
      expect(shouldPromote(1, true)).toBe(true);
      expect(shouldPromote(2, true)).toBe(true);
    });

    it('should return false when at Box 3 (max level)', () => {
      expect(shouldPromote(3, true)).toBe(false);
    });

    it('should return false when failing', () => {
      expect(shouldPromote(1, false)).toBe(false);
      expect(shouldPromote(2, false)).toBe(false);
      expect(shouldPromote(3, false)).toBe(false);
    });

    it('should handle all combinations', () => {
      // Box 1
      expect(shouldPromote(1, true)).toBe(true);  // Pass → promote
      expect(shouldPromote(1, false)).toBe(false); // Fail → no promote

      // Box 2
      expect(shouldPromote(2, true)).toBe(true);  // Pass → promote
      expect(shouldPromote(2, false)).toBe(false); // Fail → no promote

      // Box 3 (max)
      expect(shouldPromote(3, true)).toBe(false); // Pass → stay at max
      expect(shouldPromote(3, false)).toBe(false); // Fail → no promote
    });
  });

  describe('algorithm determinism', () => {
    it('should always produce the same result for same inputs', () => {
      // Box transition should be deterministic
      for (let box = 1; box <= 3; box++) {
        for (let passed of [true, false]) {
          const results = Array(100).fill(null).map(() => calculateNewBox(box, passed));
          const allSame = results.every(r => r === results[0]);
          expect(allSame).toBe(true);
        }
      }
    });

    it('should follow the exact promotion rules from specification', () => {
      // From spec:
      // Box 1, Pass → Box 2
      expect(calculateNewBox(1, true)).toBe(2);

      // Box 2, Pass → Box 3
      expect(calculateNewBox(2, true)).toBe(3);

      // Box 3, Pass → Box 3 (maintain)
      expect(calculateNewBox(3, true)).toBe(3);

      // Any, Fail → Box 1
      expect(calculateNewBox(1, false)).toBe(1);
      expect(calculateNewBox(2, false)).toBe(1);
      expect(calculateNewBox(3, false)).toBe(1);
    });
  });
});
