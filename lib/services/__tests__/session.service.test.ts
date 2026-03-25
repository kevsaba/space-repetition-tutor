/**
 * Unit tests for SessionService
 *
 * Tests session management functionality:
 * - createSession() - Create a new study session (FREE or INTERVIEW mode)
 * - getSessionProgress() - Get session details with answer counts
 */

import { createSession, getSessionProgress, SessionError } from '../session.service';
import { prisma } from '../../prisma';

// Mock Prisma client
jest.mock('../../prisma', () => ({
  prisma: {
    career: {
      findUnique: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    answer: {
      findMany: jest.fn(),
    },
  },
}));

describe('SessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    const mockUserId = 'user-123';

    it('should create a FREE mode session without careerId', async () => {
      const mockSession = {
        id: 'session-1',
        userId: mockUserId,
        mode: 'FREE',
        careerId: null,
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-23T10:00:00Z'),
      };

      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await createSession(mockUserId, 'FREE');

      expect(result).toEqual({
        id: 'session-1',
        mode: 'FREE',
        status: 'IN_PROGRESS',
        startedAt: mockSession.startedAt,
      });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mode: 'FREE',
          careerId: null,
          status: 'IN_PROGRESS',
        },
      });

      // Should not check for career
      expect(prisma.career.findUnique).not.toHaveBeenCalled();
    });

    it('should create an INTERVIEW mode session with careerId', async () => {
      const mockCareerId = 'career-abc';
      const mockSession = {
        id: 'session-2',
        userId: mockUserId,
        mode: 'INTERVIEW',
        careerId: mockCareerId,
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-23T10:00:00Z'),
      };

      const mockCareer = {
        id: mockCareerId,
        name: 'Backend Engineer',
      };

      (prisma.career.findUnique as jest.Mock).mockResolvedValue(mockCareer);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await createSession(mockUserId, 'INTERVIEW', mockCareerId);

      expect(result).toEqual({
        id: 'session-2',
        mode: 'INTERVIEW',
        status: 'IN_PROGRESS',
        startedAt: mockSession.startedAt,
      });

      expect(prisma.career.findUnique).toHaveBeenCalledWith({
        where: { id: mockCareerId },
      });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mode: 'INTERVIEW',
          careerId: mockCareerId,
          status: 'IN_PROGRESS',
        },
      });
    });

    it('should throw SessionError when INTERVIEW mode missing careerId', async () => {
      await expect(createSession(mockUserId, 'INTERVIEW')).rejects.toThrow(SessionError);
      await expect(createSession(mockUserId, 'INTERVIEW')).rejects.toThrow('Career ID is required for INTERVIEW mode');

      try {
        await createSession(mockUserId, 'INTERVIEW');
        fail('Expected SessionError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionError);
        expect((error as SessionError).code).toBe('CAREER_ID_REQUIRED');
      }

      // Should not create session
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('should throw SessionError when career does not exist for INTERVIEW mode', async () => {
      const mockCareerId = 'non-existent-career';

      (prisma.career.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createSession(mockUserId, 'INTERVIEW', mockCareerId)).rejects.toThrow(SessionError);
      await expect(createSession(mockUserId, 'INTERVIEW', mockCareerId)).rejects.toThrow('Career not found');

      try {
        await createSession(mockUserId, 'INTERVIEW', mockCareerId);
        fail('Expected SessionError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionError);
        expect((error as SessionError).code).toBe('CAREER_NOT_FOUND');
      }

      // Should verify career exists before creating session
      expect(prisma.career.findUnique).toHaveBeenCalledWith({
        where: { id: mockCareerId },
      });

      // Should not create session
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('should handle optional careerId for FREE mode', async () => {
      const mockSession = {
        id: 'session-3',
        userId: mockUserId,
        mode: 'FREE',
        careerId: null,
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-23T10:00:00Z'),
      };

      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      // FREE mode with careerId provided should ignore it
      const result = await createSession(mockUserId, 'FREE', 'ignored-career-id');

      expect(result.mode).toBe('FREE');
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mode: 'FREE',
          careerId: null, // Should be null for FREE mode
          status: 'IN_PROGRESS',
        },
      });
    });

    it('should create session with correct timestamps', async () => {
      const beforeCreate = new Date();

      const mockSession = {
        id: 'session-timestamp',
        userId: mockUserId,
        mode: 'FREE',
        careerId: null,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      };

      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await createSession(mockUserId, 'FREE');

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.startedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    });
  });

  describe('getSessionProgress', () => {
    const mockUserId = 'user-456';
    const mockSessionId = 'session-progress-1';

    it('should return session progress with answer counts', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        mode: 'FREE',
        careerId: null,
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-23T10:00:00Z'),
        completedAt: null,
      };

      const mockAnswers = [
        { id: 'answer-1', passed: true },
        { id: 'answer-2', passed: true },
        { id: 'answer-3', passed: false },
        { id: 'answer-4', passed: true },
        { id: 'answer-5', passed: false },
      ];

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await getSessionProgress(mockSessionId, mockUserId);

      expect(result).toEqual({
        session: {
          id: mockSessionId,
          mode: 'FREE',
          status: 'IN_PROGRESS',
          startedAt: mockSession.startedAt,
          completedAt: null,
          career: null,
        },
        progress: {
          questionsAnswered: 5,
          questionsPassed: 3,
          questionsFailed: 2,
        },
      });

      expect(prisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockSessionId,
          userId: mockUserId,
        },
      });

      expect(prisma.answer.findMany).toHaveBeenCalledWith({
        where: {
          sessionId: mockSessionId,
        },
      });
    });

    it('should return session progress for INTERVIEW mode with career', async () => {
      const mockCareerId = 'career-interview';
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        mode: 'INTERVIEW',
        careerId: mockCareerId,
        status: 'COMPLETED',
        startedAt: new Date('2025-03-23T10:00:00Z'),
        completedAt: new Date('2025-03-23T11:00:00Z'),
      };

      const mockCareer = {
        id: mockCareerId,
        name: 'Backend Engineer',
      };

      const mockAnswers = [
        { id: 'answer-1', passed: true },
        { id: 'answer-2', passed: false },
      ];

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.career.findUnique as jest.Mock).mockResolvedValue(mockCareer);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await getSessionProgress(mockSessionId, mockUserId);

      expect(result.session.career).toEqual({
        id: mockCareerId,
        name: 'Backend Engineer',
      });

      expect(result.progress).toEqual({
        questionsAnswered: 2,
        questionsPassed: 1,
        questionsFailed: 1,
      });

      expect(prisma.career.findUnique).toHaveBeenCalledWith({
        where: { id: mockCareerId },
      });
    });

    it('should handle session with no answers', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        mode: 'FREE',
        careerId: null,
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-23T10:00:00Z'),
        completedAt: null,
      };

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getSessionProgress(mockSessionId, mockUserId);

      expect(result.progress).toEqual({
        questionsAnswered: 0,
        questionsPassed: 0,
        questionsFailed: 0,
      });
    });

    it('should throw SessionError when session not found', async () => {
      (prisma.session.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getSessionProgress(mockSessionId, mockUserId)).rejects.toThrow(SessionError);
      await expect(getSessionProgress(mockSessionId, mockUserId)).rejects.toThrow('Session not found');

      try {
        await getSessionProgress(mockSessionId, mockUserId);
        fail('Expected SessionError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionError);
        expect((error as SessionError).code).toBe('SESSION_NOT_FOUND');
      }

      // Should not fetch answers for non-existent session
      expect(prisma.answer.findMany).not.toHaveBeenCalled();
    });

    it('should throw SessionError when session belongs to different user', async () => {
      const differentUserId = 'user-different';

      // Session exists but for different user
      (prisma.session.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getSessionProgress(mockSessionId, differentUserId)).rejects.toThrow(SessionError);
      await expect(getSessionProgress(mockSessionId, differentUserId)).rejects.toThrow('Session not found');
    });

    it('should handle INTERVIEW mode session with non-existent career', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        mode: 'INTERVIEW',
        careerId: 'deleted-career-id',
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-23T10:00:00Z'),
        completedAt: null,
      };

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.career.findUnique as jest.Mock).mockResolvedValue(null); // Career was deleted
      (prisma.answer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getSessionProgress(mockSessionId, mockUserId);

      // Should gracefully handle missing career
      expect(result.session.career).toBeNull();
      expect(result.progress.questionsAnswered).toBe(0);
    });

    it('should correctly calculate pass/fail counts', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        mode: 'FREE',
        careerId: null,
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-23T10:00:00Z'),
        completedAt: null,
      };

      // Mix of passed and failed answers
      const mockAnswers = [
        { id: 'a1', passed: true },
        { id: 'a2', passed: true },
        { id: 'a3', passed: true },
        { id: 'a4', passed: false },
        { id: 'a5', passed: false },
        { id: 'a6', passed: true },
        { id: 'a7', passed: false },
        { id: 'a8', passed: true },
        { id: 'a9', passed: false },
        { id: 'a10', passed: false },
      ];

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await getSessionProgress(mockSessionId, mockUserId);

      expect(result.progress).toEqual({
        questionsAnswered: 10,
        questionsPassed: 5,
        questionsFailed: 5,
      });
    });

    it('should handle all passed scenario', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        mode: 'FREE',
        careerId: null,
        status: 'COMPLETED',
        startedAt: new Date('2025-03-23T10:00:00Z'),
        completedAt: new Date('2025-03-23T11:00:00Z'),
      };

      const mockAnswers = [
        { id: 'a1', passed: true },
        { id: 'a2', passed: true },
        { id: 'a3', passed: true },
      ];

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await getSessionProgress(mockSessionId, mockUserId);

      expect(result.progress).toEqual({
        questionsAnswered: 3,
        questionsPassed: 3,
        questionsFailed: 0,
      });
    });

    it('should handle all failed scenario', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        mode: 'FREE',
        careerId: null,
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-23T10:00:00Z'),
        completedAt: null,
      };

      const mockAnswers = [
        { id: 'a1', passed: false },
        { id: 'a2', passed: false },
        { id: 'a3', passed: false },
        { id: 'a4', passed: false },
      ];

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await getSessionProgress(mockSessionId, mockUserId);

      expect(result.progress).toEqual({
        questionsAnswered: 4,
        questionsPassed: 0,
        questionsFailed: 4,
      });
    });

    it('should return completed session with completion timestamp', async () => {
      const completedAt = new Date('2025-03-23T12:30:00Z');

      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        mode: 'INTERVIEW',
        careerId: null,
        status: 'COMPLETED',
        startedAt: new Date('2025-03-23T10:00:00Z'),
        completedAt,
      };

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getSessionProgress(mockSessionId, mockUserId);

      expect(result.session.completedAt).toEqual(completedAt);
      expect(result.session.status).toBe('COMPLETED');
    });
  });
});
