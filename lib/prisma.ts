/**
 * Prisma Client Singleton with Runtime Config Support
 *
 * Prevents multiple instances of Prisma Client in development.
 * Uses runtime config from setup wizard or falls back to environment variables.
 *
 * IMPORTANT: We override the datasource URL directly in the PrismaClient
 * constructor to bypass Prisma's env() validation at module import time.
 * This allows runtime config to work without requiring a server restart.
 *
 * See: https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl, getDirectUrl } from '@/lib/config/runtime';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  databaseUrl: string | undefined;
};

/**
 * Create a new Prisma Client instance
 *
 * CRITICAL: We override the datasource URL directly to bypass Prisma's
 * env validation at module import time. This allows runtime config to work.
 */
function createPrismaClient(): PrismaClient {
  // Get database URL from runtime config or env
  let databaseUrl: string;
  let directUrl: string;

  try {
    databaseUrl = getDatabaseUrl();
    directUrl = getDirectUrl();
  } catch (error) {
    // Runtime config not available, will use Prisma's default env handling
    databaseUrl = process.env.DATABASE_URL || '';
    directUrl = process.env.DIRECT_URL || '';
  }

  // Store the URL for change detection
  globalForPrisma.databaseUrl = databaseUrl;

  // Create Prisma Client with explicit datasource URLs
  // This bypasses the env() validation in schema.prisma
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

/**
 * Get or create the Prisma Client singleton
 *
 * This function lazily initializes the client, ensuring that runtime config
 * is loaded before Prisma tries to access environment variables.
 *
 * If the database URL has changed (e.g., after setup), it creates a new client.
 */
export function getPrismaClient(): PrismaClient {
  // Check if we need to recreate the client (database URL changed)
  if (globalForPrisma.prisma) {
    try {
      const currentUrl = getDatabaseUrl();
      if (currentUrl !== globalForPrisma.databaseUrl) {
        console.log('[Prisma] Database URL changed, recreating client...');
        globalForPrisma.prisma = undefined;
      }
    } catch {
      // Runtime config not available, keep existing client
    }
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Export the prisma client for backward compatibility
// This will trigger lazy initialization on first access
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    return client[prop as keyof PrismaClient];
  },
});

export default prisma;
