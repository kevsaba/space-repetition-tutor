/**
 * Database Health Service
 *
 * Checks if the database is properly configured and tables exist.
 * This is used to detect when DATABASE_URL is set but tables are missing
 * (e.g., after dropping tables or running prisma migrate reset).
 */

import { prisma } from '../prisma';

export interface DatabaseHealthResult {
  healthy: boolean;
  message?: string;
  needsSetup: boolean;
}

/**
 * Check if the database is healthy by verifying key tables exist.
 *
 * This is a lightweight check that tries to query the User table.
 * If the table doesn't exist, Prisma will throw a specific error.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  try {
    // Try a simple query to verify the User table exists
    // We use findFirst with a false condition to get no results but verify the table exists
    await prisma.user.findFirst({
      where: { id: 'this-id-definitely-does-not-exist' },
    });

    return {
      healthy: true,
      needsSetup: false,
    };
  } catch (error: unknown) {
    // Check if this is a "table does not exist" error
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('does not exist') ||
        errorMessage.includes('relation') ||
        errorMessage.includes('table')) {
      return {
        healthy: false,
        message: 'Database tables not found. Please run database setup.',
        needsSetup: true,
      };
    }

    // Check if this is a connection error
    if (errorMessage.includes('connect') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('ECONNREFUSED')) {
      return {
        healthy: false,
        message: 'Cannot connect to database. Please check your connection.',
        needsSetup: true,
      };
    }

    // Unknown error
    return {
      healthy: false,
      message: 'Database error: ' + errorMessage,
      needsSetup: true,
    };
  }
}

/**
 * Helper to check if an error is a "table not found" error
 */
export function isTableNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('does not exist') ||
         message.includes('relation') ||
         message.includes('table');
}

/**
 * Helper to check if an error is a database connection error
 */
export function isConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('connect') ||
         message.includes('connection') ||
         message.includes('ECONNREFUSED');
}
