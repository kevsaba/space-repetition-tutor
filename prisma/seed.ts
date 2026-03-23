/**
 * Seed data for Space Repetition Tutor
 *
 * Creates template topics and questions for Phase 1.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create template topics
  const topics = await Promise.all([
    prisma.topic.upsert({
      where: { name: 'Java Concurrency' },
      update: {},
      create: {
        name: 'Java Concurrency',
        category: 'Backend',
        track: 'JAVA',
        difficulty: 'MID',
        isTemplate: true,
      },
    }),
    prisma.topic.upsert({
      where: { name: 'Java Collections Framework' },
      update: {},
      create: {
        name: 'Java Collections Framework',
        category: 'Backend',
        track: 'JAVA',
        difficulty: 'MID',
        isTemplate: true,
      },
    }),
    prisma.topic.upsert({
      where: { name: 'REST API Design' },
      update: {},
      create: {
        name: 'REST API Design',
        category: 'Backend',
        track: 'JAVA',
        difficulty: 'MID',
        isTemplate: true,
      },
    }),
    prisma.topic.upsert({
      where: { name: 'Database Design' },
      update: {},
      create: {
        name: 'Database Design',
        category: 'Database',
        track: 'GENERAL',
        difficulty: 'MID',
        isTemplate: true,
      },
    }),
    prisma.topic.upsert({
      where: { name: 'System Design Basics' },
      update: {},
      create: {
        name: 'System Design Basics',
        category: 'Distributed Systems',
        track: 'DISTRIBUTED_SYSTEMS',
        difficulty: 'MID',
        isTemplate: true,
      },
    }),
  ]);

  console.log(`Created ${topics.length} topics`);

  // Create template questions (3 per topic)
  const javaConcurrencyTopic = topics[0];
  const collectionsTopic = topics[1];
  const restApiTopic = topics[2];
  const databaseTopic = topics[3];
  const systemDesignTopic = topics[4];

  const questions: Array<{
    content: string;
    type: 'CONCEPTUAL';
    difficulty: 'MID';
    topicId: string;
    expectedTopics: string[];
    hint: string;
  }> = [
    // Java Concurrency questions
    {
      content: 'Explain the difference between synchronized blocks and ReentrantLock in Java. When would you choose one over the other?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: javaConcurrencyTopic.id,
      expectedTopics: ['concurrency', 'synchronization', 'locks'],
      hint: 'Consider fairness, interruptibility, and tryLock capabilities',
    },
    {
      content: 'What is the Java Memory Model and how does it affect concurrent programming? Explain happens-before relationships.',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: javaConcurrencyTopic.id,
      expectedTopics: ['JMM', 'memory visibility', 'happens-before'],
      hint: 'Think about volatile, final fields, and synchronization rules',
    },
    {
      content: 'Explain how thread pools work in Java. When would you use different types of thread pools?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: javaConcurrencyTopic.id,
      expectedTopics: ['ExecutorService', 'thread pools', 'concurrency'],
      hint: 'Consider FixedThreadPool, CachedThreadPool, and ForkJoinPool',
    },

    // Java Collections questions
    {
      content: 'Explain the difference between HashMap and ConcurrentHashMap. How does ConcurrentHashMap achieve thread safety?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: collectionsTopic.id,
      expectedTopics: ['collections', 'concurrency', 'maps'],
      hint: 'Think about locking strategies and segment-based locking',
    },
    {
      content: 'When would you use TreeMap vs HashMap? What are the trade-offs?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: collectionsTopic.id,
      expectedTopics: ['collections', 'data structures', 'performance'],
      hint: 'Consider sorting, ordering, and performance characteristics',
    },
    {
      content: 'Explain how ArrayList grows internally. What happens when you add an element beyond its capacity?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: collectionsTopic.id,
      expectedTopics: ['collections', 'arrays', 'performance'],
      hint: 'Think about capacity management and array copying',
    },

    // REST API Design questions
    {
      content: 'Explain the principles of RESTful API design. What makes an API truly RESTful?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: restApiTopic.id,
      expectedTopics: ['REST', 'API design', 'HTTP'],
      hint: 'Consider resources, HTTP verbs, and statelessness',
    },
    {
      content: 'How do you handle versioning in REST APIs? What are the different approaches and their trade-offs?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: restApiTopic.id,
      expectedTopics: ['REST', 'API versioning', 'backward compatibility'],
      hint: 'Consider URL versioning, header versioning, and content negotiation',
    },
    {
      content: 'Explain idempotency in REST APIs. Which HTTP methods are idempotent and why does it matter?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: restApiTopic.id,
      expectedTopics: ['REST', 'HTTP', 'idempotency'],
      hint: 'Think about GET, PUT, DELETE, and how they affect state',
    },

    // Database Design questions
    {
      content: 'Explain the difference between clustered and non-clustered indexes. When would you use each?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: databaseTopic.id,
      expectedTopics: ['databases', 'indexes', 'performance'],
      hint: 'Consider data storage order and lookup performance',
    },
    {
      content: 'What is database normalization? When would you denormalize and why?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: databaseTopic.id,
      expectedTopics: ['databases', 'normalization', 'schema design'],
      hint: 'Think about data integrity vs query performance',
    },
    {
      content: 'Explain ACID properties in database transactions. Why is each property important?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: databaseTopic.id,
      expectedTopics: ['databases', 'transactions', 'ACID'],
      hint: 'Consider what could go wrong without each property',
    },

    // System Design Basics questions
    {
      content: 'Explain the CAP theorem. What trade-offs do you need to make when designing distributed systems?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: systemDesignTopic.id,
      expectedTopics: ['CAP theorem', 'distributed systems', 'trade-offs'],
      hint: 'Consider consistency, availability, and partition tolerance',
    },
    {
      content: 'What is a load balancer? How does it improve system scalability and reliability?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: systemDesignTopic.id,
      expectedTopics: ['load balancing', 'scalability', 'high availability'],
      hint: 'Think about distribution algorithms and health checks',
    },
    {
      content: 'Explain caching strategies. When would you use different cache eviction policies?',
      type: 'CONCEPTUAL',
      difficulty: 'MID',
      topicId: systemDesignTopic.id,
      expectedTopics: ['caching', 'performance', 'eviction policies'],
      hint: 'Consider LRU, LFU, and TTL-based expiration',
    },
  ];

  for (const question of questions) {
    await prisma.question.upsert({
      where: {
        id: question.content.substring(0, 20).replace(/\s/g, '_')
      },
      update: {},
      create: {
        content: question.content,
        type: question.type,
        difficulty: question.difficulty,
        topicId: question.topicId,
        expectedTopics: question.expectedTopics,
        hint: question.hint,
        isTemplate: true,
      },
    });
  }

  console.log(`Created ${questions.length} questions`);

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
