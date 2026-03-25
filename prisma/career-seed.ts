/**
 * Career Track Seed Data for Space Repetition Tutor
 *
 * Creates template career tracks and their associated topics for Phase 3: Interview Mode.
 * Each career track has a carefully ordered sequence of topics for interview preparation.
 *
 * Run with: npx tsx prisma/career-seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Senior Java Backend Career Track
 *
 * Topics ordered from foundational to advanced for backend Java interviews.
 */
const SENIOR_JAVA_BACKEND = {
  name: 'Senior Java Backend',
  description:
    'Comprehensive preparation for senior Java backend engineering roles. ' +
    'Covers core Java, concurrency, database design, distributed systems, and system design principles.',
  topics: [
    { name: 'Java Concurrency', category: 'Backend', track: 'JAVA', difficulty: 'SENIOR', order: 1 },
    { name: 'Java Collections Framework', category: 'Backend', track: 'JAVA', difficulty: 'MID', order: 2 },
    { name: 'JVM Internals', category: 'Backend', track: 'JAVA', difficulty: 'SENIOR', order: 3 },
    { name: 'Spring Framework', category: 'Backend', track: 'JAVA', difficulty: 'MID', order: 4 },
    { name: 'Database Design', category: 'Database', track: 'GENERAL', difficulty: 'MID', order: 5 },
    { name: 'SQL Performance Optimization', category: 'Database', track: 'GENERAL', difficulty: 'SENIOR', order: 6 },
    { name: 'REST API Design', category: 'Backend', track: 'JAVA', difficulty: 'MID', order: 7 },
    { name: 'Microservices Architecture', category: 'Distributed Systems', track: 'DISTRIBUTED_SYSTEMS', difficulty: 'SENIOR', order: 8 },
    { name: 'System Design Basics', category: 'Distributed Systems', track: 'DISTRIBUTED_SYSTEMS', difficulty: 'MID', order: 9 },
    { name: 'Caching Strategies', category: 'Distributed Systems', track: 'DISTRIBUTED_SYSTEMS', difficulty: 'SENIOR', order: 10 },
  ],
};

/**
 * Full Stack Developer Career Track
 *
 * Balanced coverage of frontend and backend technologies.
 */
const FULL_STACK_DEVELOPER = {
  name: 'Full Stack Developer',
  description:
    'Interview preparation for full-stack roles covering both frontend and backend fundamentals. ' +
    'Focuses on modern web development, API design, databases, and system architecture.',
  topics: [
    { name: 'JavaScript Fundamentals', category: 'Frontend', track: 'GENERAL', difficulty: 'MID', order: 1 },
    { name: 'React Principles', category: 'Frontend', track: 'GENERAL', difficulty: 'MID', order: 2 },
    { name: 'State Management', category: 'Frontend', track: 'GENERAL', difficulty: 'MID', order: 3 },
    { name: 'REST API Design', category: 'Backend', track: 'GENERAL', difficulty: 'MID', order: 4 },
    { name: 'Database Design', category: 'Database', track: 'GENERAL', difficulty: 'MID', order: 5 },
    { name: 'Authentication & Authorization', category: 'Backend', track: 'GENERAL', difficulty: 'MID', order: 6 },
    { name: 'System Design Basics', category: 'Distributed Systems', track: 'DISTRIBUTED_SYSTEMS', difficulty: 'MID', order: 7 },
    { name: 'Web Performance', category: 'Frontend', track: 'GENERAL', difficulty: 'SENIOR', order: 8 },
  ],
};

/**
 * Python Backend Career Track
 *
 * Focus on Python backend development and data engineering.
 */
const PYTHON_BACKEND = {
  name: 'Python Backend',
  description:
    'Interview preparation for Python backend engineering roles. ' +
    'Covers Python internals, async programming, frameworks, data engineering, and API design.',
  topics: [
    { name: 'Python Internals', category: 'Backend', track: 'PYTHON', difficulty: 'MID', order: 1 },
    { name: 'Python Concurrency', category: 'Backend', track: 'PYTHON', difficulty: 'SENIOR', order: 2 },
    { name: 'Django/Flask Frameworks', category: 'Backend', track: 'PYTHON', difficulty: 'MID', order: 3 },
    { name: 'Database Design', category: 'Database', track: 'GENERAL', difficulty: 'MID', order: 4 },
    { name: 'SQL Performance', category: 'Database', track: 'GENERAL', difficulty: 'MID', order: 5 },
    { name: 'REST API Design', category: 'Backend', track: 'GENERAL', difficulty: 'MID', order: 6 },
    { name: 'Data Engineering Basics', category: 'Database', track: 'PYTHON', difficulty: 'MID', order: 7 },
    { name: 'System Design Basics', category: 'Distributed Systems', track: 'DISTRIBUTED_SYSTEMS', difficulty: 'MID', order: 8 },
  ],
};

/**
 * All career tracks to seed
 */
const CAREER_TRACKS = [SENIOR_JAVA_BACKEND, FULL_STACK_DEVELOPER, PYTHON_BACKEND];

/**
 * Create or update a topic
 */
async function upsertTopic(topicData: {
  name: string;
  category: string;
  track: string;
  difficulty: string;
}) {
  return prisma.topic.upsert({
    where: { name: topicData.name },
    update: {},
    create: {
      name: topicData.name,
      category: topicData.category,
      track: topicData.track as 'JAVA' | 'PYTHON' | 'DISTRIBUTED_SYSTEMS' | 'GENERAL',
      difficulty: topicData.difficulty as 'JUNIOR' | 'MID' | 'SENIOR',
      isTemplate: true,
    },
  });
}

/**
 * Create or update a career track with its topics
 */
async function seedCareerTrack(careerData: typeof SENIOR_JAVA_BACKEND) {
  // Create or update the career
  const career = await prisma.career.upsert({
    where: { name: careerData.name },
    update: { description: careerData.description },
    create: {
      name: careerData.name,
      description: careerData.description,
    },
  });

  console.log(`  Career: ${career.name} (${career.id})`);

  // Create or update topics and link them to the career
  for (const topicData of careerData.topics) {
    const topic = await upsertTopic(topicData);

    // Create CareerTopic link
    await prisma.careerTopic.upsert({
      where: {
        careerId_topicId: {
          careerId: career.id,
          topicId: topic.id,
        },
      },
      update: { order: topicData.order },
      create: {
        careerId: career.id,
        topicId: topic.id,
        order: topicData.order,
      },
    });

    console.log(`    Topic ${topicData.order}: ${topic.name}`);
  }

  return career;
}

/**
 * Main seed function
 */
async function main() {
  console.log('Starting career track seed...\n');

  const careers: Array<{ id: string; name: string; topicCount: number }> = [];

  for (const careerData of CAREER_TRACKS) {
    console.log(`Seeding career: ${careerData.name}`);
    const career = await seedCareerTrack(careerData);
    careers.push({
      id: career.id,
      name: career.name,
      topicCount: careerData.topics.length,
    });
    console.log('');
  }

  console.log('Career track seed complete!');
  console.log('\nSummary:');
  careers.forEach((c) => {
    console.log(`  - ${c.name}: ${c.topicCount} topics`);
  });
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
