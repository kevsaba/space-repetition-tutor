/**
 * Career Track Seed Data for Space Repetition Tutor
 *
 * This app is language-agnostic and starts with no pre-populated career tracks.
 * Career tracks are created by users via the upload feature or manually.
 *
 * This file is kept for compatibility but does nothing.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('No career track seed data to create.');
  console.log('Career tracks are created by users via upload or manual setup.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
