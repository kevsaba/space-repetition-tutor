/**
 * Unit tests for CareerService
 *
 * Tests career track management functionality:
 * - getAllCareeries() - Retrieve all available career tracks
 * - selectCareer() - Activate a career track for a user
 * - getActiveCareer() - Get user's active career with due question counts
 */

import { getAllCareers, selectCareer, getActiveCareer, CareerError } from '../career.service';
import { prisma } from '../../prisma';

// Mock Prisma client
jest.mock('../../prisma', () => ({
  prisma: {
    career: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    userCareer: {
      updateMany: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    userQuestion: {
      count: jest.fn(),
    },
  },
}));

describe('CareerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCareers', () => {
    it('should return all careers with topic counts ordered by name', async () => {
      const mockCareers = [
        {
          id: 'career-1',
          name: 'Backend Engineer',
          description: 'Backend development track',
          _count: { careerTopics: 5 },
        },
        {
          id: 'career-2',
          name: 'Frontend Engineer',
          description: 'Frontend development track',
          _count: { careerTopics: 3 },
        },
      ];

      (prisma.career.findMany as jest.Mock).mockResolvedValue(mockCareers);

      const result = await getAllCareers();

      expect(result).toEqual([
        {
          id: 'career-1',
          name: 'Backend Engineer',
          description: 'Backend development track',
          topicCount: 5,
        },
        {
          id: 'career-2',
          name: 'Frontend Engineer',
          description: 'Frontend development track',
          topicCount: 3,
        },
      ]);

      expect(prisma.career.findMany).toHaveBeenCalledWith({
        include: {
          _count: {
            select: { careerTopics: true },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    it('should return empty array when no careers exist', async () => {
      (prisma.career.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getAllCareers();

      expect(result).toEqual([]);
      expect(prisma.career.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectCareer', () => {
    const mockUserId = 'user-123';
    const mockCareerId = 'career-abc';

    it('should activate a new career track for a user', async () => {
      const mockCareer = {
        id: mockCareerId,
        name: 'Backend Engineer',
        description: 'Backend track',
      };

      const mockUserCareer = {
        id: 'user-career-1',
        userId: mockUserId,
        careerId: mockCareerId,
        isActive: true,
        startedAt: new Date('2025-03-23T00:00:00Z'),
        career: mockCareer,
      };

      (prisma.career.findUnique as jest.Mock).mockResolvedValue(mockCareer);
      (prisma.userCareer.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.userCareer.upsert as jest.Mock).mockResolvedValue(mockUserCareer);

      const result = await selectCareer(mockUserId, mockCareerId);

      expect(result).toEqual({
        id: 'user-career-1',
        career: {
          id: mockCareerId,
          name: 'Backend Engineer',
        },
        isActive: true,
        startedAt: mockUserCareer.startedAt,
      });

      // Verify career was checked for existence
      expect(prisma.career.findUnique).toHaveBeenCalledWith({
        where: { id: mockCareerId },
      });

      // Verify previous careers were deactivated
      expect(prisma.userCareer.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Verify new career was activated
      expect(prisma.userCareer.upsert).toHaveBeenCalledWith({
        where: {
          userId_careerId: {
            userId: mockUserId,
            careerId: mockCareerId,
          },
        },
        update: {
          isActive: true,
          startedAt: expect.any(Date),
        },
        create: {
          userId: mockUserId,
          careerId: mockCareerId,
          isActive: true,
        },
        include: {
          career: true,
        },
      });
    });

    it('should reactivate an existing career assignment', async () => {
      const mockCareer = {
        id: mockCareerId,
        name: 'Backend Engineer',
        description: 'Backend track',
      };

      // The upsert should return the updated record (isActive: true after update)
      const mockUpdatedUserCareer = {
        id: 'user-career-existing',
        userId: mockUserId,
        careerId: mockCareerId,
        isActive: true, // Now active after reactivation
        startedAt: new Date('2025-03-20T00:00:00Z'),
        career: mockCareer,
      };

      (prisma.career.findUnique as jest.Mock).mockResolvedValue(mockCareer);
      (prisma.userCareer.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.userCareer.upsert as jest.Mock).mockResolvedValue(mockUpdatedUserCareer);

      const result = await selectCareer(mockUserId, mockCareerId);

      expect(result.isActive).toBe(true);
      expect(prisma.userCareer.upsert).toHaveBeenCalledWith({
        where: {
          userId_careerId: {
            userId: mockUserId,
            careerId: mockCareerId,
          },
        },
        update: {
          isActive: true,
          startedAt: expect.any(Date), // Resets startedAt on reactivation
        },
        create: {
          userId: mockUserId,
          careerId: mockCareerId,
          isActive: true,
        },
        include: {
          career: true,
        },
      });
    });

    it('should deactivate previously active career when selecting a new one', async () => {
      const mockCareer = {
        id: mockCareerId,
        name: 'Backend Engineer',
        description: 'Backend track',
      };

      const mockUserCareer = {
        id: 'user-career-new',
        userId: mockUserId,
        careerId: mockCareerId,
        isActive: true,
        startedAt: new Date('2025-03-23T00:00:00Z'),
        career: mockCareer,
      };

      (prisma.career.findUnique as jest.Mock).mockResolvedValue(mockCareer);
      (prisma.userCareer.updateMany as jest.Mock).mockResolvedValue({ count: 1 }); // One career was deactivated
      (prisma.userCareer.upsert as jest.Mock).mockResolvedValue(mockUserCareer);

      await selectCareer(mockUserId, mockCareerId);

      expect(prisma.userCareer.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should throw CareerError when career does not exist', async () => {
      (prisma.career.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(selectCareer(mockUserId, 'non-existent-career')).rejects.toThrow(CareerError);
      await expect(selectCareer(mockUserId, 'non-existent-career')).rejects.toThrow('Career not found');

      // Should not proceed with upsert
      expect(prisma.userCareer.upsert).not.toHaveBeenCalled();
    });

    it('should throw CareerError with correct code', async () => {
      (prisma.career.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await selectCareer(mockUserId, 'invalid-id');
        fail('Expected CareerError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CareerError);
        expect((error as CareerError).code).toBe('CAREER_NOT_FOUND');
      }
    });
  });

  describe('getActiveCareer', () => {
    const mockUserId = 'user-456';

    it('should return active career with topics and due question counts', async () => {
      const mockUserCareer = {
        career: {
          id: 'career-1',
          name: 'Backend Engineer',
          description: 'Backend development track',
          careerTopics: [
            {
              order: 1,
              topic: {
                id: 'topic-1',
                name: 'Java Concurrency',
                category: 'Backend',
              },
            },
            {
              order: 2,
              topic: {
                id: 'topic-2',
                name: 'REST API Design',
                category: 'Backend',
              },
            },
          ],
        },
        startedAt: new Date('2025-03-20T00:00:00Z'),
      };

      (prisma.userCareer.findFirst as jest.Mock).mockResolvedValue(mockUserCareer);
      (prisma.userQuestion.count as jest.Mock)
        .mockResolvedValueOnce(3) // 3 due questions for topic 1
        .mockResolvedValueOnce(0); // 0 due questions for topic 2

      const result = await getActiveCareer(mockUserId);

      expect(result).toEqual({
        id: 'career-1',
        name: 'Backend Engineer',
        description: 'Backend development track',
        startedAt: mockUserCareer.startedAt,
        topics: [
          {
            id: 'topic-1',
            name: 'Java Concurrency',
            category: 'Backend',
            order: 1,
            questionsDue: 3,
          },
          {
            id: 'topic-2',
            name: 'REST API Design',
            category: 'Backend',
            order: 2,
            questionsDue: 0,
          },
        ],
      });

      expect(prisma.userCareer.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
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

      // Verify count was called for each topic
      expect(prisma.userQuestion.count).toHaveBeenCalledTimes(2);
    });

    it('should throw CareerError when user has no active career', async () => {
      (prisma.userCareer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getActiveCareer(mockUserId)).rejects.toThrow(CareerError);
      await expect(getActiveCareer(mockUserId)).rejects.toThrow('No active career found');

      try {
        await getActiveCareer(mockUserId);
        fail('Expected CareerError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CareerError);
        expect((error as CareerError).code).toBe('NO_ACTIVE_CAREER');
      }
    });

    it('should handle career with no topics gracefully', async () => {
      const mockUserCareer = {
        career: {
          id: 'career-empty',
          name: 'Empty Career',
          description: 'A career with no topics',
          careerTopics: [],
        },
        startedAt: new Date('2025-03-20T00:00:00Z'),
      };

      (prisma.userCareer.findFirst as jest.Mock).mockResolvedValue(mockUserCareer);

      const result = await getActiveCareer(mockUserId);

      expect(result.topics).toEqual([]);
      expect(prisma.userQuestion.count).not.toHaveBeenCalled();
    });

    it('should correctly calculate due questions for all topics', async () => {
      const mockUserCareer = {
        career: {
          id: 'career-1',
          name: 'Full Stack Engineer',
          description: 'Full stack track',
          careerTopics: [
            {
              order: 1,
              topic: {
                id: 'topic-1',
                name: 'Topic 1',
                category: 'Backend',
              },
            },
            {
              order: 2,
              topic: {
                id: 'topic-2',
                name: 'Topic 2',
                category: 'Frontend',
              },
            },
            {
              order: 3,
              topic: {
                id: 'topic-3',
                name: 'Topic 3',
                category: 'Database',
              },
            },
          ],
        },
        startedAt: new Date('2025-03-20T00:00:00Z'),
      };

      (prisma.userCareer.findFirst as jest.Mock).mockResolvedValue(mockUserCareer);
      (prisma.userQuestion.count as jest.Mock)
        .mockResolvedValueOnce(5) // Topic 1: 5 due
        .mockResolvedValueOnce(2) // Topic 2: 2 due
        .mockResolvedValueOnce(7); // Topic 3: 7 due

      const result = await getActiveCareer(mockUserId);

      expect(result.topics[0].questionsDue).toBe(5);
      expect(result.topics[1].questionsDue).toBe(2);
      expect(result.topics[2].questionsDue).toBe(7);

      // Verify topics are in correct order
      expect(result.topics[0].order).toBe(1);
      expect(result.topics[1].order).toBe(2);
      expect(result.topics[2].order).toBe(3);
    });
  });
});
