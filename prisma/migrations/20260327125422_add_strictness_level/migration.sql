-- CreateEnum
CREATE TYPE "StrictnessLevel" AS ENUM ('DEFAULT', 'STRICT', 'LENIENT');

-- AlterTable
ALTER TABLE "user_llm_configs" ADD COLUMN     "strictnessLevel" "StrictnessLevel" NOT NULL DEFAULT 'DEFAULT';
