/**
 * GET /api/health
 *
 * Health check endpoint that verifies:
 * - API is running
 * - Database is accessible
 * - LLM service is reachable
 *
 * Returns detailed status for each service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { llmService } from '@/lib/services/llm';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    llm: 'up' | 'down' | 'skipped';
    llmProvider?: string;
    llmModel?: string;
  };
  uptime: number;
}

/**
 * GET handler for health check
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'down',
      llm: 'skipped',
    },
    uptime: process.uptime(),
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'up';
  } catch (error) {
    console.error('Database health check failed:', error);
    health.services.database = 'down';
    health.status = 'unhealthy';
  }

  // Check LLM service connectivity
  try {
    // Get LLM config from runtime config or environment variables
    const { getLLMApiUrl, getLLMApiKey, getLLMModel } = await import('@/lib/config/runtime');

    let llmConfig = {
      apiKey: process.env.LLM_API_KEY || '',
      apiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
    };

    // Try to get config from runtime config if env vars are not set
    if (!llmConfig.apiKey) {
      try {
        llmConfig = {
          apiKey: getLLMApiKey(),
          apiUrl: getLLMApiUrl(),
          model: getLLMModel(),
        };
      } catch {
        // Runtime config not available, use defaults
      }
    }

    if (!llmConfig.apiKey || llmConfig.apiKey === 'your-api-key-here') {
      // LLM not configured, skip the check
      health.services.llm = 'skipped';
      health.services.llmProvider = 'not configured';
    } else {
      // Make a minimal request to check connectivity
      const testUrl = llmConfig.apiUrl.includes('/chat/completions')
        ? llmConfig.apiUrl
        : llmConfig.apiUrl.endsWith('/')
          ? `${llmConfig.apiUrl}chat/completions`
          : `${llmConfig.apiUrl}/chat/completions`;

      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        // Short timeout for health check
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        health.services.llm = 'up';
        health.services.llmProvider = llmConfig.apiUrl;
        health.services.llmModel = llmConfig.model;
      } else {
        health.services.llm = 'down';
        health.services.llmProvider = llmConfig.apiUrl;
        health.status = health.status === 'healthy' ? 'degraded' : health.status;
      }
    }
  } catch (error) {
    console.error('LLM health check failed:', error);
    health.services.llm = 'down';
    health.status = health.status === 'healthy' ? 'degraded' : health.status;
  }

  // Set appropriate HTTP status code
  const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 : // Still 200 for degraded, status in body
                      503;

  return NextResponse.json(health, { status: statusCode });
}
