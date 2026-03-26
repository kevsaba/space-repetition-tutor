-- Create StoragePreference enum
CREATE TYPE "StoragePreference" AS ENUM ('SESSION', 'DATABASE');

-- Create user_llm_configs table
CREATE TABLE "user_llm_configs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "apiUrl" TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  "apiKeyEncrypted" TEXT,
  "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  "storagePreference" "StoragePreference" NOT NULL DEFAULT 'SESSION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_llm_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_llm_configs_userId_key" ON "user_llm_configs"("userId");
CREATE INDEX "user_llm_configs_userId_idx" ON "user_llm_configs"("userId");

ALTER TABLE "user_llm_configs"
ADD CONSTRAINT "user_llm_configs_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
