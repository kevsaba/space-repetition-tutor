# Planning Agent Prompt: Spaced Repetition Interview Tutor

> **Version:** 1.3
> **Created:** 2025-03-23
> **Updated:** 2025-03-23
> **Purpose:** This document serves as the complete specification for planning and building an AI-driven spaced repetition tutor application.
>
> **v1.2 Changes:**
> - Database: Supabase (PostgreSQL) - enables future auth upgrade path
> - Monorepo: Single repository structure for v1 simplicity
> - Backend: Next.js API Routes (v1), can extract to Fastify later
> - Leitner boxes: 3 boxes (1d, 3d, 7d) - classic proven intervals
> - Follow-ups: Always generated (both Free and Interview modes)
> - Questions: Always LLM-generated (no pre-seeded pool for v1)
> - Stats: Minimal (box distribution only) - focus on learning science
>
> **v1.3 Changes:**
> - Context Window Management: Handoff protocol when agents approach token limits
> - Divide and Conquer: Atomic task units that can be completed, verified, killed
> - Milestone-Based Execution: All work proceeds in milestones with user approval gates

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Principles](#architecture-principles)
4. [Core Domain Model](#core-domain-model)
5. [Leitner System Algorithm](#leitner-system-algorithm)
6. [Multi-Agent Workflow](#multi-agent-workflow)
7. [Phase Planning](#phase-planning)
8. [Deliverables](#deliverables)

---

## Project Overview

**Vision:** An AI-driven study companion that helps users prepare for technical interviews using spaced repetition and active recall.

**Core Value Proposition:**
- Focus study time on weak areas (Leitner system)
- Active recall strengthens memory better than passive reading
- AI-generated feedback that's interview-ready
- Both free learning and structured interview modes

**Target Users:**
- Developers preparing for senior-level interviews
- People wanting to retain technical knowledge long-term
- Teams wanting to assess interview readiness

---

## Tech Stack

### Backend
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js 20+ LTS | Fast iteration, great ecosystem, suitable for I/O-bound work |
| Language | TypeScript | Type safety prevents bugs, better DX, Prisma integration |
| Framework | Next.js API Routes | v1 simplicity, single repo, can extract to Fastify later if needed |
| Database | Supabase (PostgreSQL) | Managed Postgres, built-in auth for future upgrade |
| ORM | Prisma | Best TypeScript experience, type-safe queries, great migrations |
| LLM Client | LiteLLM proxy | Vendor-agnostic, single endpoint for multiple providers |

### Frontend
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 14 (App Router) | SSR option, built-in API routes, excellent DX |
| Styling | Tailwind CSS | Fast to build, small bundle, utility-first |
| State | React Context + hooks | Simple enough for this app, no Redux overhead |
| Forms | React Hook Form | Performant, easy validation, great TypeScript support |

### DevOps
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Hosting | Vercel (frontend) | Seamless Next.js deployment |
| Database | Supabase | PostgreSQL + built-in auth for future upgrade |
| Monorepo | Single repo | Simpler for v1, can split later if needed |

### LLM Configuration
```
Endpoint: https://aikeys.maibornwolff.de/v1
Model: gpt-4o-mini (for v1)
Fallback: Design for provider switching via config
```

---

## Architecture Principles

### 1. Clean Separation of Concerns

**v1 Architecture (Single Repo, Next.js API Routes):**

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js App                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Frontend (app/)                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │  UI Layer    │  │  State Layer │  │  Components  │ │    │
│  │  │  (Tailwind)  │  │   (Context)  │  │   (React)    │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              API Routes (app/api/)                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │  Routes      │→ │  Services    │→ │   Repository │ │    │
│  │  │  (handlers)  │  │  (Business)  │  │  (Prisma)    │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  │                              │                         │    │
│  │                        ┌─────▼─────┐                   │    │
│  │                        │   LLM     │                   │    │
│  │                        │  Service  │                   │    │
│  │                        └───────────┘                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                       │
│  users │ topics │ questions │ user_questions │ sessions     │
└─────────────────────────────────────────────────────────────┘
```

**v2+ Option (Extract Backend):**
If the API routes become too complex, extract to a separate Fastify service.
The architecture is designed to make this extraction painless - services are already isolated.

### 2. Layer Responsibilities

| Layer | Responsibilities | MUST NOT |
|-------|------------------|----------|
| Controllers | Request validation, response formatting, HTTP status codes | Business logic |
| Services | Leitner algorithm, orchestration, business rules | HTTP concepts |
| Repository | Data access, Prisma queries | Business rules |
| LLM Service | Prompt construction, response parsing, retry logic | Business decisions |

### 3. Error Handling Strategy

```typescript
// Domain errors - NOT HTTP errors
class DomainError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Examples
new DomainError("Question not found", "QUESTION_NOT_FOUND")
new DomainError("No due questions available", "NO_QUESTIONS_DUE")

// Controller maps DomainError → HTTP status
```

---

## Core Domain Model

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───────│UserQuestion │───────│  Question   │
│             │  1:N  │             │  N:1  │             │
│ - id        │       │ - id        │       │ - id        │
│ - username  │       │ - userId    │       │ - content   │
│ - password  │       │ - questionId│       │ - topicId   │
│ - createdAt │       │ - box       │       │ - type      │
└─────────────┘       │ - dueDate   │       │ - difficulty│
                      │ - streak    │       │ - isTemplate│
                      │ - lastSeen  │       └─────────────┘
                      └─────────────┘              │
                            │                      │
                            │                      │ 1:N
┌─────────────┐       ┌─────▼─────┐       ┌─────────────┐
│   Session   │───────│  Answer   │       │    Topic    │
│             │  1:N  │           │       │             │
│ - id        │       │ - id      │       │ - id        │
│ - userId    │       │ - userQId │       │ - name      │
│ - mode      │       │ - content │       │ - category  │
│ - status    │       │ - passed  │       │ - track     │
│ - startedAt │       │ - feedback│       └─────────────┘
│ - completedAt│      │ - answered│              │
└─────────────┘       └───────────┘              │ 1:N
                      ┌─────────────┐       ┌─────▼─────┐
                      │  Career    │───────│CareerTopic│
                      │            │  1:N  │           │
                      │ - id       │       │ - careerId│
                      │ - name     │       │ - topicId │
                      │ - desc     │       │ - order   │
                      └─────────────┘       └───────────┘
```

### Database Schema (Prisma)

```prisma
// Simplified preview - planning agent should expand
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String   // hashed
  sessions  Session[]
  userQuestions UserQuestion[]
  createdAt DateTime @default(now())
}

model Question {
  id          String   @id @default(cuid())
  content     String
  type        QuestionType
  difficulty  Difficulty
  topicId     String
  topic       Topic    @relation(fields: [topicId], references: [id])
  isTemplate  Boolean  @default(false)
  createdBy   String?  // userId if template created by user
  userQuestions UserQuestion[]
  answers     Answer[]
  createdAt   DateTime @default(now())
}

model UserQuestion {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  questionId  String
  question    Question @relation(fields: [questionId], references: [id])
  box         Int      @default(1) // 1, 2, or 3
  dueDate     DateTime
  streak      Int      @default(0)
  lastSeenAt  DateTime?
  answers     Answer[]
  createdAt   DateTime @default(now())

  @@unique([userId, questionId])
}

enum QuestionType {
  CONCEPTUAL
  CODING      // v2
  DESIGN      // v2
}

enum Box {
  ONE
  TWO
  THREE
}
```

---

## Leitner System Algorithm

### The Core: Fetch Due Questions

**This is deterministic. No LLM involved.**

```typescript
interface FetchDueQuestionsInput {
  userId: string;
  sessionId: string;
  limit?: number; // default 5
}

interface FetchDueQuestionsOutput {
  questions: DueQuestion[];
  hasNewQuestionsAvailable: boolean;
}

interface DueQuestion {
  id: string;
  content: string;
  topic: string;
  box: number;
  timesSeen: number;
  isNew: boolean; // First time seeing this question
}

// PSEUDO-CODE - Planning agent to implement
async function fetchDueQuestions(input: FetchDueQuestionsInput): Promise<FetchDueQuestionsOutput> {
  // 1. Fetch all UserQuestions for user that are due
  const dueQuestions = await db.userQuestion.findMany({
    where: {
      userId: input.userId,
      dueDate: { lte: now() }
    },
    include: { question: { include: { topic: true } } },
    orderBy: [
      { box: 'asc' },           // Box 1 first
      { dueDate: 'asc' },       // Earliest due first
      { lastSeenAt: 'asc' }     // Haven't seen in a while
    ],
    take: input.limit ?? 5
  });

  // 2. If we have enough due questions, return them
  if (dueQuestions.length >= (input.limit ?? 5)) {
    return { questions: mapToOutput(dueQuestions), hasNewQuestionsAvailable: false };
  }

  // 3. Not enough due questions? Fetch new ones
  const remaining = (input.limit ?? 5) - dueQuestions.length;
  const newQuestions = await fetchNewQuestions({
    userId: input.userId,
    sessionId: input.sessionId,
    limit: remaining
  });

  // 4. Create UserQuestion entries for new questions (Box 1, due now)
  const created = await db.userQuestion.createMany({
    data: newQuestions.map(q => ({
      userId: input.userId,
      questionId: q.id,
      box: 1,
      dueDate: now()
    }))
  });

  return {
    questions: [...mapToOutput(dueQuestions), ...newQuestions],
    hasNewQuestionsAvailable: await hasMoreNewQuestions(input.userId)
  };
}
```

### Answer Evaluation & Box Transition

```typescript
interface EvaluateAnswerInput {
  userQuestionId: string;
  userAnswer: string;
  mode: 'FREE' | 'INTERVIEW';
}

interface EvaluateAnswerOutput {
  passed: boolean;
  feedback: StructuredFeedback;
  newBox: number;
  nextDueDate: Date;
}

// PSEUDO-CODE
async function evaluateAnswer(input: EvaluateAnswerInput): Promise<EvaluateAnswerOutput> {
  // 1. Get the question and user's current state
  const userQuestion = await db.userQuestion.findUnique({
    where: { id: input.userQuestionId },
    include: { question: true }
  });

  // 2. Call LLM for evaluation
  const llmResponse = await llmService.evaluate({
    question: userQuestion.question.content,
    userAnswer: input.userAnswer,
    currentBox: userQuestion.box,
    mode: input.mode
  });

  // 3. DETERMINISTIC box transition (LLM only influences feedback)
  const passed = llmResponse.passed;
  const currentBox = userQuestion.box;

  let newBox: number;
  if (passed) {
    newBox = Math.min(currentBox + 1, 3); // Max box 3
  } else {
    newBox = 1; // Reset to box 1 on failure
  }

  // 4. Calculate next due date based on new box
  const nextDueDate = calculateDueDate(newBox);

  // 5. Update state
  await db.userQuestion.update({
    where: { id: input.userQuestionId },
    data: {
      box: newBox,
      dueDate: nextDueDate,
      lastSeenAt: now(),
      streak: passed ? userQuestion.streak + 1 : 0
    }
  });

  // 6. Record answer
  await db.answer.create({
    data: {
      userQuestionId: input.userQuestionId,
      content: input.userAnswer,
      passed,
      feedback: llmResponse.feedback
    }
  });

  return {
    passed,
    feedback: llmResponse.feedback,
    newBox,
    nextDueDate
  };
}

function calculateDueDate(box: number): Date {
  const now = new Date();
  const days = box === 1 ? 1 : box === 2 ? 3 : 7;
  return addDays(now, days);
}
```

### Fetch New Questions Strategy

```typescript
// When no due questions exist, ALWAYS generate new questions via LLM
async function fetchNewQuestions(input: { userId: string; limit: number }): Promise<Question[]> {
  // Get user's focus topics or career track
  const focusTopics = await getUserFocusTopics(input.userId);

  // Always generate fresh questions via LLM
  const generated = await llmService.generateQuestions({
    count: input.limit,
    topics: focusTopics,
    careerTrack: await getUserCareerTrack(input.userId),
    difficulty: await getUserDifficultyLevel(input.userId)
  });

  // Store as templates (can be reused for other users)
  const created = await db.question.createMany({
    data: generated.map(q => ({
      ...q,
      isTemplate: true,
      createdBy: input.userId
    }))
  });

  return generated;
}
```

**Why always LLM-generated?**
- Infinite variety - no question reuse boredom
- Personalized to user's level and focus areas
- Questions stay current with tech changes
- No manual curation overhead

---

## Multi-Agent Workflow

### Agent Roles

| Agent | Responsibilities | Cannot Merge Without |
|-------|------------------|----------------------|
| **Supervisor** | Orchestrates workflow, enforces rules, self-heals CLAUDE.md | N/A (coordinates) |
| **Backend Agent** | Database, API, services, Leitner logic | Reviewer approval |
| **Frontend Agent** | UI, components, state, forms | Reviewer approval |
| **Reviewer Agent** | Testing, code review, approval gate | All tests pass |

### Branch Strategy

```
main (protected)
 │
 ├─ feature/auth            ← Backend + Frontend parallel work
 ├─ feature/leitner-core
 ├─ feature/llm-integration
 ├─ feature/interview-mode
 ├─ feature/coding-questions (v2)
 └─ feature/gamification (v2)
```

### Workflow Per Feature

```
1. Supervisor creates feature branch from main
2. Supervisor spawns Backend + Frontend agents in parallel
3. Each agent:
   a. Creates sub-branch: feature/name-backend or feature/name-frontend
   b. Implements their part
   c. Runs tests
   d. Pushes and requests review
4. Reviewer agent:
   a. Reviews both PRs
   b. Runs full test suite
   c. Requests changes if needed
   d. Approves when ready
5. Supervisor merges both to feature branch
6. Reviewer runs integration tests on feature branch
7. Supervisor requests user approval
8. After user approval: merge feature → main
9. Delete feature branch
```

### Self-Healing Rules

**If ANY agent violates these rules, Supervisor MUST:**

1. **Stop the violation immediately**
2. **Revert any unapproved merges**
3. **Document in CLAUDE.md:**
   ```markdown
   ## Violation Log

   ### [Date] - [Violation Type]
   - **What happened:** [description]
   - **Why it was wrong:** [reason]
   - **How it was fixed:** [action]
   - **Rule update:** [new rule to prevent recurrence]
   ```

**Common violations to watch for:**
- Merging to main without user approval
- Merging without Reviewer approval
- Skipping tests
- Breaking type safety (`any` escapes)
- Putting business logic in controllers
- Making LLM decide Leitner transitions
- Hardcoding instead of config

### Context Window Management

**CRITICAL: All agents MUST monitor their token usage and handle context limits gracefully.**

#### Agent Context Protocol

```typescript
// PSEUDO-CODE - Every agent MUST implement this pattern
interface AgentContext {
  tokensUsed: number;
  tokensRemaining: number;
  checkpoint: string | null;
  handoffInstructions: string | null;
}

const CONTEXT_THRESHOLD = 0.80; // 80% of context window

function shouldHandoff(context: AgentContext): boolean {
  return context.tokensRemaining / context.tokensTotal < CONTEXT_THRESHOLD;
}
```

#### Handoff Rules

**When an agent approaches context limit (80% threshold):**

1. **IF current task can be completed quickly:**
   - Finish the task
   - Write completion summary
   - Report back to Supervisor
   - Self-terminate

2. **IF current task CANNOT be completed:**
   - Write a `HANDOFF.md` file containing:
     ```markdown
     # Agent Handoff: [Agent Name] → [Successor Name]

     ## Current State
     - What I was doing: [task description]
     - What is complete: [list]
     - What is in progress: [list]
     - What is pending: [list]

     ## Context for Successor
     - Files modified: [list with paths]
     - Decisions made: [list with rationale]
     - Pending decisions: [list]
     - Blockers: [if any]

     ## Next Steps (Order Preserved)
     1. [Step 1]
     2. [Step 2]
     3. [Step 3]

     ## DO NOT
     - [Things successor should avoid]
     ```
   - Commit all work with message: `[HANDOFF] Agent [name] context limit - handing off to [successor]`
   - Report to Supervisor with handoff location
   - Self-terminate

#### Supervisor's Handoff Responsibilities

**When an agent reports context limit:**

```typescript
// Supervisor MUST:
1. Read the HANDOFF.md
2. Spawn a fresh agent of same type
3. Pass HANDOFF.md contents as initial context
4. Monitor the new agent
5. Kill the exhausted agent
6. Update context tracking
```

#### No Half-Done Jobs Rule

```typescript
// Before ANY agent self-terminates (context limit or otherwise):
interface AgentExitChecklist {
  // ALL of these must be true:
  allFilesCommitted: boolean;
  noUncommittedChanges: boolean;
  handoffDocumentWritten: boolean;  // if incomplete
  supervisorNotified: boolean;
  statePersistedForHandoff: boolean; // if incomplete
}
```

### Divide and Conquer Strategy

**Work MUST be broken into small, atomic units that can be:**
- Completed independently
- Verified independently
- Killed after completion
- Respawned fresh for next unit

#### Atomic Task Units

```typescript
// Instead of: "Build the entire auth system"
// Use: "Build auth service login endpoint"

interface AtomicTask {
  id: string;
  description: string;          // One clear objective
  agentType: 'backend' | 'frontend' | 'reviewer';
  estimatedTokens: number;      // For context planning
  dependencies: string[];       // Task IDs that must complete first
  outputs: string[];            // Files, endpoints, etc.
  testable: boolean;            // Must be true
  completionCriteria: string[]; // Definition of done
}
```

#### Task Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPERVISOR                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Define     │───▶│  Spawn      │───▶│  Monitor    │         │
│  │  Atomic     │    │  Agent      │    │  Progress   │         │
│  │  Task       │    │  (fresh)    │    │             │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                            │                   │                │
│                            │                   ▼                │
│                            │         ┌─────────────────┐        │
│                            │         │ Context Check?   │        │
│                            │         └─────────────────┘        │
│                            │            │           │           │
│                            │          No           Yes          │
│                            │            │           │           │
│                            │            ▼           ▼           │
│                            │     ┌──────────┐  ┌──────────┐    │
│                            │     │ Continue │  │  Handoff │    │
│                            │     │          │  │  + Spawn │    │
│                            │     └──────────┘  │  New     │    │
│                            │                  └──────────┘    │
│                            │                      │            │
│                            ▼                      ▼            │
│                   ┌─────────────────┐    ┌──────────────┐    │
│                   │  Task Complete? │    │ Reviewer     │    │
│                   └─────────────────┘    │ Verifies     │    │
│                            │             └──────────────┘    │
│                           Yes                                │
│                            │                                 │
│                            ▼                                 │
│                   ┌─────────────────┐                       │
│                   │  Kill Agent     │                       │
│                   │  (cleanup)      │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Milestone-Based Execution

**ALL work proceeds in milestones. NO milestone proceeds without user approval.**

#### Milestone Definition

```typescript
interface Milestone {
  id: string;
  name: string;
  description: string;
  tasks: string[];              // Atomic task IDs
  deliverables: string[];       // What exists after this milestone
  approvalRequired: boolean;    // ALWAYS true for major milestones
  reviewerApproval: boolean;    // Reviewer must approve first
}

// Example milestone structure:
const MILESTONES = [
  {
    id: "M1",
    name: "Foundation",
    description: "Project setup, database schema, basic auth",
    tasks: ["T1.1", "T1.2", "T1.3", "T1.4"],
    deliverables: [
      "CLAUDE.md",
      "schema.prisma",
      "API.md",
      "Working auth flow"
    ]
  },
  {
    id: "M2",
    name: "Leitner Core",
    description: "Leitner algorithm implementation",
    tasks: ["T2.1", "T2.2", "T2.3"],
    deliverables: [
      "Leitner service",
      "Question fetch endpoint",
      "Answer evaluation endpoint"
    ]
  }
  // ... more milestones
];
```

#### Milestone Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     MILESTONE WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. SUPERVISOR: Announce milestone start
   ├─ "🎯 Starting Milestone [M1]: Foundation"
   ├─ List tasks to be completed
   └─ List expected deliverables

2. SUPERVISOR: Spawn agents for parallel tasks
   ├─ Backend Agent: T1.1, T1.2
   ├─ Frontend Agent: T1.3
   └─ Each agent gets atomic task only

3. AGENTS: Complete tasks
   ├─ Each agent works on their atomic unit
   ├─ Context handoffs if needed
   └─ Report completion to Supervisor

4. REVIEWER: Verify all tasks
   ├─ Review each completed task
   ├─ Run tests
   ├─ Check deliverables exist
   └─ Report pass/fail to Supervisor

5. SUPERVISOR: Milestone Review Request
   ├─ Gather all deliverables
   ├─ Create milestone summary
   └─ REQUEST USER APPROVAL

   ┌─────────────────────────────────────────────────────┐
   │  🏁 MILESTONE [M1] COMPLETE - AWAITING REVIEW       │
   │                                                     │
   │  Completed Tasks:                                   │
   │  ✅ T1.1: Database schema                           │
   │  ✅ T1.2: Auth service                              │
   │  ✅ T1.3: Login UI                                  │
   │                                                     │
   │  Deliverables:                                      │
   │  📄 CLAUDE.md                                       │
   │  📄 schema.prisma                                   │
   │  📄 API.md                                          │
   │                                                     │
   │  Test Results:                                      │
   │  ✅ 15/15 tests passing                             │
   │                                                     │
   │  Please review and decide:                          │
   │  [ ] Approve - Continue to next milestone           │
   │  [ ] Request changes - specify what                 │
   │  [ ] Abandon milestone - restart                    │
   └─────────────────────────────────────────────────────┘

6. USER: Reviews and responds
   ├─ If "Approve" → Supervisor proceeds to M2
   ├─ If "Changes" → Supervisor spawns agents to fix
   └─ If "Abandon" → Supervisor restarts milestone

7. SUPERVISOR: Cleanup
   ├─ Kill all agents from this milestone
   ├─ Archive milestone artifacts
   └─ Update progress tracking
```

#### Supervisor's Milestone Responsibilities

```typescript
// Supervisor MUST do this for EVERY milestone:

interface SupervisorMilestoneDuties {
  // BEFORE milestone:
  announceMilestone: () => void;           // Tell user what's happening
  spawnAgents: (tasks: AtomicTask[]) => void; // Fresh agents only
  setCheckpoint: () => string;              // Git tag/branch

  // DURING milestone:
  monitorAgentContext: () => void;          // Watch for token limits
  handleHandoffs: (handoff: Handoff) => void; // Spawn replacements
  trackProgress: () => MilestoneProgress;

  // AFTER milestone (BEFORE proceeding):
  gatherDeliverables: () => Deliverable[];  // Collect all outputs
  requestReviewerApproval: () => Promise<boolean>; // Reviewer checks
  requestUserApproval: () => Promise<UserDecision>; // USER DECIDES
  archiveMilestone: () => void;             // Tag, document, cleanup
}
```

#### Milestone Checkpoint Template

Every milestone completion must include:

```markdown
## 🎯 Milestone [M1]: Foundation - COMPLETE

**Completed:** 2025-03-23
**Duration:** X hours
**Agents:** Backend (2 handoffs), Frontend (1 handoff), Reviewer

### Tasks Completed
- ✅ T1.1: Database schema (schema.prisma) - Backend Agent #1
- ✅ T1.2: Auth service (services/auth.ts) - Backend Agent #2 (handoff)
- ✅ T1.3: Login UI (app/login/page.tsx) - Frontend Agent #1
- ✅ T1.4: Auth tests (tests/auth.test.ts) - Reviewer

### Deliverables
| File | Path | Status |
|------|------|--------|
| Schema | `/prisma/schema.prisma` | ✅ Created |
| API Spec | `/docs/API.md` | ✅ Created |
| CLAUDE.md | `/CLAUDE.md` | ✅ Updated |
| Auth UI | `/app/login/page.tsx` | ✅ Created |

### Test Results
```
Backend Tests: PASS (8/8)
Frontend Tests: PASS (5/5)
Integration: PASS (2/2)
E2E: PASS (3/3)
```

### Decisions Made
1. Using bcrypt for password hashing (standard, secure)
2. JWT tokens stored in httpOnly cookies (security best practice)
3. Refresh token rotation implemented (security requirement)

### Pending Decisions
- None

### Next Milestone Preview
**M2: Leitner Core** will implement:
- Leitner algorithm service
- Question fetch endpoint
- Answer evaluation with LLM

---

**REVIEW REQUIRED BEFORE PROCEEDING TO M2**

Please review the above and confirm:
- [ ] Approve - Proceed to M2
- [ ] Request changes (specify below)
- [ ] Abandon M1 and restart
```

### Anti-Patterns to Avoid

```typescript
// ❌ WRONG: Monolithic agent that does everything
const badPattern = {
  agent: "SuperAgent",
  task: "Build the entire application",
  result: "Context explosion, half-done work, confusion"
};

// ✅ RIGHT: Small, focused, atomic tasks
const goodPattern = {
  agents: [
    { type: "backend", task: "Create Prisma schema" },
    { type: "backend", task: "Implement login endpoint" },
    { type: "frontend", task: "Build login form" },
    { type: "reviewer", task: "Test auth flow" }
  ],
  result: "Clean, verifiable, completable work"
};
```

---

## Phase Planning

### Phase 1: Foundation (MVP)

**Goal:** Core Leitner engine working end-to-end

**Backend:**
- [ ] Prisma schema with core entities
- [ ] Database migrations
- [ ] Leitner algorithm service
- [ ] Auth service (simple, replaceable)
- [ ] Question fetch endpoint
- [ ] Answer submit endpoint

**Frontend:**
- [ ] Next.js project setup with Tailwind
- [ ] Auth flow (login/signup)
- [ ] Question display component
- [ ] Answer input component
- [ ] Feedback display component

**Integration:**
- [ ] End-to-end: login → see question → answer → get feedback → box updates

**Reviewer:**
- [ ] Unit tests for Leitner algorithm
- [ ] Integration tests for API
- [ ] E2E tests with Playwright

### Phase 2: LLM Integration

**Backend:**
- [ ] LLM service with LiteLLM
- [ ] Prompt templates for evaluation
- [ ] Prompt templates for question generation
- [ ] Response parsing and validation
- [ ] Retry logic with fallback

**Frontend:**
- [ ] Loading states for LLM calls
- [ ] Error handling for LLM failures

**Reviewer:**
- [ ] Mock LLM for tests
- [ ] Contract tests for LLM responses

### Phase 3: Interview Mode

**Backend:**
- [ ] Question upload (CSV/JSON)
- [ ] Template question pool
- [ ] Follow-up question generation
- [ ] Session management for interview mode

**Frontend:**
- [ ] Upload UI
- [ ] Interview progress tracking
- [ ] Follow-up question flow

**Reviewer:**
- [ ] Test file upload edge cases
- [ ] Test follow-up relevance

### Phase 4: Polish & Minimal Dashboard

**Backend:**
- [ ] Box distribution query (how many questions in each box)
- [ ] Basic performance optimization

**Frontend:**
- [ ] Simple dashboard showing box distribution
  - Box 1: X questions (review daily)
  - Box 2: Y questions (review every 3 days)
  - Box 3: Z questions (review weekly)

**Reviewer:**
- [ ] Load testing
- [ ] Performance benchmarks

**Note:** Intentionally minimal stats. Focus is on learning science, not gamification.

### Phase 5: Future Features (Out of Scope for v1)

- [ ] Coding questions with code execution
- [ ] Gamification (XP, levels, achievements)
- [ ] Social features (shared templates, leaderboards)
- [ ] Mobile app
- [ ] Multi-language support

---

## LLM Integration Specifications

### Evaluation Prompt Template

```
You are an expert interviewer evaluating a candidate's answer.

Question: {question}
Candidate's Answer: {userAnswer}
Current Box: {currentBox} (1 = struggling, 2 = improving, 3 = mastered)

Evaluate based on:
1. Technical accuracy
2. Depth of understanding
3. Ability to explain clearly
4. Interview-ready articulation

Respond in JSON format:
{
  "passed": true/false,
  "feedback": {
    "evaluation": "What they got right, specific points they captured",
    "higherLevelArticulation": "How to phrase this at senior level",
    "correction": "Any misconceptions to correct, with explanation",
    "failureTimeline": "What goes wrong without this knowledge (step by step)",
    "interviewReadyAnswer": "2-3 sentence polished answer",
    "analogy": "Memorable analogy or mnemonic",
    "productionInsight": "How this matters in real systems"
  }
}

Be fair but rigorous. Box 1 requires basic understanding. Box 3 requires nuanced, senior-level articulation.
```

### Question Generation Prompt Template

```
You are generating interview questions for: {topic}

Difficulty: {difficulty} (junior/mid/senior)
Type: {type} (conceptual/coding/design)

Generate {count} questions that:
- Test deep understanding, not syntax trivia
- Require explaining trade-offs
- Connect to real production scenarios
- Have multiple valid approaches (for design questions)

Respond in JSON format:
{
  "questions": [
    {
      "content": "The question text",
      "difficulty": "MID",
      "type": "CONCEPTUAL",
      "expectedTopics": ["topic1", "topic2"],
      "hint": "Optional hint for if they struggle"
    }
  ]
}
```

### Follow-Up Question Generation (Both Modes)

**Follow-ups happen after EVERY question in both Free Learning and Interview modes.**

```
Original Question: {originalQuestion}
Candidate's Answer: {userAnswer}
Evaluation: {passed}
Mode: {mode} (FREE or INTERVIEW)

Generate up to 2 follow-up questions that:
1. Dig deeper into gaps identified
2. Test related concepts they should know
3. Are directly relevant to the original topic

Do NOT change to a completely different topic.

Respond in JSON:
{
  "followUpQuestions": [
    {
      "content": "Follow-up question text",
      "reason": "Why this follow-up is relevant"
    }
  ]
}

If the answer was perfect and no follow-ups are needed, return empty array.
```

**Follow-up evaluation:** Each follow-up is evaluated independently and affects the original question's box status.
- All follow-ups passed → Box promotion
- Any follow-up failed → Box demotion to 1

---

## Authentication Design

### Requirements
- Simple username/password
- Stored in localStorage (client)
- Hashed in database (server)
- Designed for easy replacement (OAuth, magic link, etc.)

### Implementation

```typescript
// Current simple auth - easy to swap
interface AuthService {
  register(username: string, password: string): Promise<User>
  login(username: string, password: string): Promise<{ user: User; token: string }>
  verifyToken(token: string): Promise<User>
}

// Design for future swap
interface AuthProvider {
  name: 'local' | 'oauth' | 'magic-link'
  authenticate(credentials: unknown): Promise<AuthResult>
  logout(): Promise<void>
}

// Swap by changing config
const authProvider: AuthProvider = config.auth.provider === 'local'
  ? new LocalAuthProvider()
  : new OAuthProvider();
```

---

## Deliverables

The planning agent must produce:

### 1. Updated CLAUDE.md
- Project overview
- Tech stack with rationale
- Architecture rules
- Multi-agent workflow
- Branch strategy
- Testing requirements
- LLM integration specs
- Violation log template

### 2. Roadmap (ROADMAP.md)
- Phase breakdown
- Dependencies between phases
- Parallel work opportunities
- Estimated complexity

### 3. Database Schema (schema.prisma)
- Complete Prisma schema
- All relations
- Indexes for performance
- Enums for type safety

### 4. API Specification (API.md)
- All endpoints
- Request/response schemas
- Error codes
- Authentication requirements

### 5. LLM Prompts (prompts/)
- Evaluation prompt
- Question generation prompt
- Follow-up prompt
- Prompt versioning strategy

### 6. Phase 1 Task Breakdown
- Backend tasks (with agent assignment)
- Frontend tasks (with agent assignment)
- Reviewer tasks
- Dependencies
- Definition of done

---

## Critical Rules for Planning Agent

1. **DO NOT** start implementation. Only plan.
2. **DO** ask clarifying questions if specifications are ambiguous.
3. **DO** identify parallel work opportunities for agents.
4. **DO** consider testing from the start, not as an afterthought.
5. **DO NOT** design things that can't be tested.
6. **DO** keep the Leitner algorithm pure and deterministic.
7. **DO** make the auth layer swappable.
8. **DO** design for LLM provider switching.

---

## Success Criteria

The planning is successful when:

- [ ] CLAUDE.md is comprehensive and actionable
- [ ] Roadmap has clear phases with deliverables
- [ ] Database schema supports all requirements
- [ ] API spec covers all use cases
- [ ] LLM prompts are well-designed
- [ ] Multi-agent workflow is unambiguous
- [ ] Phase 1 can be started immediately by agents
- [ ] All tech stack decisions are justified

---

## Appendix: Leitner System Reference

### Box Intervals
| Box | Review Interval | Rationale |
|-----|-----------------|-----------|
| 1 | 1 day | Struggling concepts need frequent repetition |
| 2 | 3 days | Some mastery, spacing increases |
| 3 | 7 days | Well-learned, maintenance mode |

### Promotion Rules
| Current Box | Result | New Box | Next Review |
|-------------|--------|---------|-------------|
| 1 | Pass | 2 | +3 days |
| 2 | Pass | 3 | +7 days |
| 3 | Pass | 3 | +7 days (maintain) |
| Any | Fail | 1 | +1 day |

### Fetch Priority
1. Box 1 questions due first (highest priority)
2. Then Box 2 questions due
3. Then Box 3 questions due
4. If none due, fetch new questions

---

**End of Planning Agent Prompt**

*This document is the source of truth. Any changes must be discussed and approved before implementation begins.*
