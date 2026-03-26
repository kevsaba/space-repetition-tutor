/**
 * Prisma Client Singleton with Runtime Config Support
 *
 * Prevents multiple instances of Prisma Client in development.
 * Uses runtime config from setup wizard or falls back to environment variables.
 *
 * IMPORTANT: Prisma Client validates env() references in schema.prisma during
 * module import. To support runtime config, we need to set environment variables
 * before the first Prisma import, then use lazy initialization.
 *
 * See: https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl, getDirectUrl } from '@/lib/config/runtime';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Set up environment variables from runtime config before creating Prisma Client
 * This is necessary because Prisma validates env() references during import
 */
function setupPrismaEnvVars(): void {
  // Only set from runtime config if env vars are not already set
  // (env vars take priority for traditional deployments)
  if (!process.env.DATABASE_URL) {
    try {
      process.env.DATABASE_URL = getDatabaseUrl();
    } catch (error) {
      // Config not available, will use default error handling
    }
  }

  if (!process.env.DIRECT_URL) {
    try {
      process.env.DIRECT_URL = getDirectUrl();
    } catch (error) {
      // Config not available, will use default error handling
    }
  }
}

/**
 * Create a new Prisma Client instance
 *
 * Note: We don't override the datasource URL here because we've already
 * set the environment variables above. The datasource override in PrismaClient
 * constructor doesn't prevent the initial env validation error.
 */
function createPrismaClient(): PrismaClient {
  // Ensure environment variables are set from runtime config
  setupPrismaEnvVars();

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

/**
 * Get or create the Prisma Client singleton
 *
 * This function lazily initializes the client, ensuring that runtime config
 * is loaded before Prisma tries to access environment variables.
 */
export function getPrismaClient(): PrismaClient {
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

if (process.env.NODE_ENV !== 'production') {
  // In development, store the actual client for hot reload handling
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = getPrismaClient();
  }
}

export default prisma;
