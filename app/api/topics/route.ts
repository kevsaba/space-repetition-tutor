/**
 * GET /api/topics
 *
 * List all available topics for the dropdown selector.
 *
 * POST /api/topics
 *
 * Create a new topic on-the-fly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate - userId is destructured to verify authentication but all topics are visible to all authenticated users
    const { userId } = await authenticate(request);

    // Fetch all topics, ordered by name
    const topics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        track: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ topics });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('List topics error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(request);

    // Parse request body
    const body = await request.json();
    const { name } = body;

    // Validate input
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Topic name is required' } },
        { status: 400 },
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Topic name must be at least 2 characters' } },
        { status: 400 },
      );
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Topic name must not exceed 100 characters' } },
        { status: 400 },
      );
    }

    // Check if topic already exists
    const existingTopic = await prisma.topic.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
      },
    });

    if (existingTopic) {
      // Topic already exists, return it
      return NextResponse.json({
        topic: {
          id: existingTopic.id,
          name: existingTopic.name,
          category: existingTopic.category,
          track: existingTopic.track,
        },
      });
    }

    // Infer category and track from topic name
    const { category, track } = inferTopicDetails(trimmedName);

    // Create new topic
    const topic = await prisma.topic.create({
      data: {
        name: trimmedName,
        category,
        track,
        difficulty: 'MID',
        isTemplate: false,
      },
    });

    return NextResponse.json({
      topic: {
        id: topic.id,
        name: topic.name,
        category: topic.category,
        track: topic.track,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    console.error('Create topic error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}

/**
 * Infer category and track from topic name
 */
function inferTopicDetails(topicName: string): { category: string; track: 'JAVA' | 'PYTHON' | 'DISTRIBUTED_SYSTEMS' | 'GENERAL' } {
  const lowerName = topicName.toLowerCase();

  // Java-related topics
  if (lowerName.includes('java') || lowerName.includes('jvm') || lowerName.includes('spring')) {
    return { category: 'Backend Development', track: 'JAVA' };
  }

  // Python-related topics
  if (lowerName.includes('python') || lowerName.includes('django') || lowerName.includes('flask')) {
    return { category: 'Backend Development', track: 'PYTHON' };
  }

  // Database topics
  if (lowerName.includes('sql') || lowerName.includes('database') || lowerName.includes('postgres') ||
      lowerName.includes('mysql') || lowerName.includes('mongo') || lowerName.includes('redis')) {
    return { category: 'Database', track: 'GENERAL' };
  }

  // Distributed systems topics
  if (lowerName.includes('distributed') || lowerName.includes('microservice') ||
      lowerName.includes('kafka') || lowerName.includes('message queue') ||
      lowerName.includes('caching') || lowerName.includes('redis')) {
    return { category: 'Distributed Systems', track: 'DISTRIBUTED_SYSTEMS' };
  }

  // Frontend topics
  if (lowerName.includes('react') || lowerName.includes('vue') || lowerName.includes('angular') ||
      lowerName.includes('javascript') || lowerName.includes('typescript') ||
      lowerName.includes('frontend') || lowerName.includes('css') || lowerName.includes('html')) {
    return { category: 'Frontend Development', track: 'GENERAL' };
  }

  // DevOps topics
  if (lowerName.includes('docker') || lowerName.includes('kubernetes') || lowerName.includes('ci/cd') ||
      lowerName.includes('deployment') || lowerName.includes('aws') || lowerName.includes('cloud')) {
    return { category: 'DevOps', track: 'GENERAL' };
  }

  // API topics
  if (lowerName.includes('api') || lowerName.includes('rest') || lowerName.includes('graphql') ||
      lowerName.includes('http')) {
    return { category: 'API Design', track: 'GENERAL' };
  }

  // Default category
  return { category: 'General', track: 'GENERAL' };
}
