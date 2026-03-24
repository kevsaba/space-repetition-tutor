# Supabase Setup Instructions

Since your network is blocking direct PostgreSQL connections, you'll need to run the migration manually in the Supabase Dashboard.

## Quick Steps:

1. Go to: https://supabase.com/dashboard/project/yjxclueysajnxiyudwxn
2. Click **SQL Editor** in the left sidebar
3. Copy and paste the SQL below (Section 1, then Section 2, then Section 3, then Section 4)
4. Click **Run** after each section

## Migration SQL

### Section 1: Create Enums
\`\`\`sql
CREATE TYPE "Track" AS ENUM ('JAVA', 'PYTHON', 'DISTRIBUTED_SYSTEMS', 'GENERAL');
CREATE TYPE "QuestionType" AS ENUM ('CONCEPTUAL', 'CODING', 'DESIGN');
CREATE TYPE "Difficulty" AS ENUM ('JUNIOR', 'MID', 'SENIOR');
CREATE TYPE "SessionMode" AS ENUM ('FREE', 'INTERVIEW');
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
\`\`\`

### Section 2: Create Tables (run in SQL Editor)
```sql
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "topics" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "track" "Track" NOT NULL DEFAULT 'JAVA',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MID',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "questions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'CONCEPTUAL',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MID',
    "topicId" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "expectedTopics" TEXT[] NOT NULL DEFAULT '{}',
    "hint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_questions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 1,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "answers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userQuestionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "feedback" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "mode" "SessionMode" NOT NULL DEFAULT 'FREE',
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "careerId" TEXT,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
```

### Section 3: Create Indexes
```sql
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "topics_track_idx" ON "topics"("track");
CREATE INDEX "topics_category_idx" ON "topics"("category");
CREATE INDEX "questions_topicId_idx" ON "questions"("topicId");
CREATE INDEX "questions_type_idx" ON "questions"("type");
CREATE INDEX "questions_isTemplate_idx" ON "questions"("isTemplate");
CREATE UNIQUE INDEX "user_questions_userId_questionId_key" ON "user_questions"("userId", "questionId");
CREATE INDEX "user_questions_userId_dueDate_idx" ON "user_questions"("userId", "dueDate");
CREATE INDEX "user_questions_dueDate_idx" ON "user_questions"("dueDate");
CREATE INDEX "answers_userQuestionId_idx" ON "answers"("userQuestionId");
CREATE INDEX "answers_answeredAt_idx" ON "answers"("answeredAt");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");
```

### Section 4: Seed Data (15 questions across 5 topics)
```sql
INSERT INTO topics (name, category, track, difficulty, isTemplate)
VALUES
  ('Java Concurrency', 'Backend', 'JAVA', 'MID', true),
  ('Java Collections Framework', 'Backend', 'JAVA', 'MID', true),
  ('REST API Design', 'Backend', 'JAVA', 'MID', true),
  ('Database Design', 'Database', 'GENERAL', 'MID', true),
  ('System Design Basics', 'Distributed Systems', 'DISTRIBUTED_SYSTEMS', 'MID', true);

INSERT INTO questions (content, type, difficulty, topicId, isTemplate, expectedTopics, hint)
SELECT 'Explain the difference between synchronized blocks and ReentrantLock in Java. When would you choose one over the other?', 'CONCEPTUAL', 'MID', (SELECT id FROM topics WHERE name = 'Java Concurrency' LIMIT 1), true, ARRAY['concurrency', 'synchronization', 'locks'], 'Consider fairness, interruptibility, and tryLock capabilities'
UNION ALL
SELECT 'What is the Java Memory Model and how does it affect concurrent programming? Explain happens-before relationships.', 'CONCEPTUAL', 'MID', (SELECT id FROM topics WHERE name = 'Java Concurrency' LIMIT 1), true, ARRAY['JMM', 'memory visibility', 'happens-before'], 'Think about volatile, final fields, and synchronization rules'
UNION ALL
SELECT 'Explain how thread pools work in Java. When would you use different types of thread pools?', 'CONCEPTUAL', 'MID', (SELECT id FROM topics WHERE name = 'Java Concurrency' LIMIT 1), true, ARRAY['ExecutorService', 'thread pools', 'concurrency'], 'Consider FixedThreadPool, CachedThreadPool, and ForkJoinPool';
```

**Copy and paste each section into the SQL Editor and click Run.**
