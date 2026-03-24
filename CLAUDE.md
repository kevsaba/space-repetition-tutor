# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Space Repetition Tutor** - An AI-driven study companion that helps users prepare for technical interviews using spaced repetition and active recall.

**Core Value Proposition:**
- Focus study time on weak areas (Leitner system)
- Active recall strengthens memory better than passive reading
- AI-generated feedback that's interview-ready
- Both free learning and structured interview modes

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
| LLM Client | LiteLLM-compatible proxy | Vendor-agnostic, single endpoint for multiple providers |

### Frontend
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 14 (App Router) | SSR option, built-in API routes, excellent DX |
| Styling | Tailwind CSS | Fast to build, small bundle, utility-first |
| State | React Context + hooks | Simple enough for this app, no Redux overhead |
| Forms | React Hook Form | Performant, easy validation, great TypeScript support |

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
    this.name = 'DomainError';
  }
}

// Examples
new DomainError("Question not found", "QUESTION_NOT_FOUND")
new DomainError("No due questions available", "NO_QUESTIONS_DUE")

// Controller maps DomainError → HTTP status
```

---

## Leitner System Algorithm

### Box Intervals
| Box | Review Interval | Rationale |
|-----|-----------------|-----------|
| 1 | 1 day | Struggling concepts need frequent repetition |
| 2 | 3 days | Some mastery, spacing increases |
| 3 | 7 days | Well-learned, maintenance mode |

### Promotion Rules (DETERMINISTIC)
| Current Box | Result | New Box | Next Review |
|-------------|--------|---------|-------------|
| 1 | Pass | 2 | +3 days |
| 2 | Pass | 3 | +7 days |
| 3 | Pass | 3 | +7 days (maintain) |
| Any | Fail | 1 | +1 day |

**CRITICAL:** The LLM NEVER decides box transitions. The backend determines PASS/FAIL using structured LLM result, then applies deterministic rules.

### Fetch Priority
1. Box 1 questions due first (highest priority)
2. Then Box 2 questions due
3. Then Box 3 questions due
4. If none due, fetch new questions via LLM

---

## Common Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server

# Database
npx prisma migrate dev   # Create and apply migration
npx prisma migrate reset # Reset database (dev only!)
npx prisma studio        # View database in browser

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode

# Linting/Type Checking
npm run lint             # ESLint
npx tsc --noEmit         # Type check without emitting

# Building
npm run build            # Production build
```

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
 ├─ feature/auth
 ├─ feature/leitner-core
 ├─ feature/llm-integration
 ├─ feature/interview-mode
 └─ feature/coding-questions (v2)
```

### Workflow Per Feature

1. Supervisor creates feature branch from main
2. Supervisor spawns Backend + Frontend agents in parallel
3. Each agent implements their part on sub-branches
4. Reviewer agent reviews and approves
5. Supervisor merges to feature branch
6. **User approval required** before merging to main
7. Delete feature branch after merge

---

## Context Window Management

**CRITICAL: All agents MUST monitor their token usage and handle context limits gracefully.**

### Handoff Rules

When an agent approaches context limit (80% threshold):

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

---

## Milestone-Based Execution

**ALL work proceeds in milestones. NO milestone proceeds without user approval.**

### Milestone Workflow

1. **SUPERVISOR:** Announce milestone start
2. **SUPERVISOR:** Spawn agents for parallel tasks
3. **AGENTS:** Complete tasks (with context handoffs if needed)
4. **REVIEWER:** Verify all tasks
5. **SUPERVISOR:** **REQUEST USER APPROVAL**
6. **USER:** Reviews and responds (Approve/Changes/Abandon)
7. **SUPERVISOR:** Cleanup and proceed

---

## CRITICAL: MILESTONE COMPLETION CHECKLIST

**SUPERVISOR MUST COMPLETE THIS CHECKLIST BEFORE REQUESTING USER APPROVAL:**

- [ ] **Backend Agent completed all tasks** (verified by task outputs)
- [ ] **Frontend Agent completed all tasks** (verified by task outputs)
- [ ] **Reviewer Agent spawned and completed verification**
- [ ] **Reviewer approved code quality** (tests pass, type checks pass)
- [ ] **Reviewer approved planning compliance** (implementation matches PLANNING_AGENT_PROMPT.md)
- [ ] **Reviewer approved behavioral requirements** (manual test scenarios pass)
- [ ] **All acceptance criteria met** (from ROADMAP.md task definitions)
- [ ] **No regressions** (existing functionality still works)
- [ ] **Build succeeds** (npm run build completes without errors)

**ONLY WHEN ALL ITEMS ABOVE ARE CHECKED:**
- THEN request USER APPROVAL for testing
- NEVER ask user to test before Reviewer approval

**VIOLATION OF THIS RULE IS A CRITICAL FAILURE.**

---

## Self-Healing Rules

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

---

## LLM Integration

### Evaluation Prompt
See `prompts/evaluate-answer.md`

### Question Generation Prompt
See `prompts/generate-questions.md`

### Follow-up Prompt
See `prompts/generate-followup.md`

### Response Format

All LLM responses must be valid JSON:

```typescript
// Evaluation response
interface LLMFeedbackResponse {
  passed: boolean;
  feedback: {
    evaluation: string;           // What they got right
    higherLevelArticulation: string; // How to phrase at senior level
    correction: string;           // Misconceptions to correct
    failureTimeline: string;      // What goes wrong without this knowledge
    interviewReadyAnswer: string; // 2-3 sentence polished answer
    analogy: string;              // Memorable analogy
    productionInsight: string;    // How this matters in real systems
  };
}

// Question generation response
interface LLMQuestionResponse {
  questions: Array<{
    content: string;
    difficulty: 'JUNIOR' | 'MID' | 'SENIOR';
    type: 'CONCEPTUAL' | 'CODING' | 'DESIGN';
    expectedTopics: string[];
    hint?: string;
  }>;
}
```

---

## Testing Requirements

Every feature MUST include:

- Unit tests (Jest/Vitest)
- Service layer coverage
- Controller contract tests
- LLM mocked in tests

**If no test exists → feature incomplete.**

---

## Critical Rules Summary

1. **🚨 NEVER SKIP THE REVIEWER AGENT** - Milestone is NOT complete until Reviewer approves (see checklist below)
2. **NEVER merge to main without user approval**
3. **NEVER let LLM decide Leitner box transitions**
4. **NEVER put business logic in controllers**
5. **NEVER skip tests**
6. **ALWAYS use type safety (no `any` escapes)**
7. **ALWAYS handle context limits with handoffs**
8. **ALWAYS work on feature branches, never main**
9. **ALWAYS document violations in CLAUDE.md**
10. **ALWAYS include acceptance criteria for every task** (prevents missing features)
11. **REVIEWER MUST verify implementation against PLANNING_AGENT_PROMPT.md** (not just code quality)

---

## Violation Log

### 2025-03-24 - Missing Feature Implementation

**What happened:** Follow-up question evaluation was specified in `PLANNING_AGENT_PROMPT.md` but was not implemented. Only follow-up generation was implemented, not the evaluation that affects box progression.

**Why it was wrong:**
- The planning document stated: "Follow-up evaluation: Each follow-up is evaluated independently and affects the original question's box status"
- ROADMAP.md task T2.4 only said "Implement follow-up question generation" - ambiguous language
- No explicit acceptance criteria for the task
- Success criteria only checked "contextually relevant" not evaluation behavior
- Reviewer checked code quality but not compliance with planning document

**How it was fixed:**
- User discovered the issue during manual testing
- Root cause analysis identified the gap
- New process rules added below to prevent recurrence

**Rule update:** Added "Task Definition Requirements" and enhanced "Reviewer Responsibilities" sections below.

### 2025-03-24 - SKIPPED REVIEWER AGENT (CRITICAL VIOLATION)

**What happened:** Supervisor declared Phase 3 complete WITHOUT spawning Reviewer agent for verification.

**Why it was wrong:**
- Planning document workflow: "AGENTS: Complete tasks → REVIEWER: Verify all tasks → SUPERVISOR: REQUEST USER APPROVAL"
- Reviewer is the GATEKEEPER - no milestone is complete without explicit approval
- User was asked to test before Reviewer verification - backwards workflow
- Planning document explicitly states: "REVIEWER agent reviews and approves" before user approval

**How it was fixed:**
- User caught the violation before testing
- Supervisor forced to follow proper workflow
- New "MILESTONE COMPLETION CHECKLIST" added below

**Rule update:** See "CRITICAL: MILESTONE COMPLETION CHECKLIST" below - this MUST be followed EVERY TIME, NO EXCEPTIONS.

---

## Task Definition Requirements

**CRITICAL:** Every task in ROADMAP.md must have:

1. **Unambiguous Name** - Include both action AND outcome
   - ❌ Bad: "Implement follow-up question generation"
   - ✅ Good: "Implement follow-up question generation AND evaluation affecting box level"

2. **Acceptance Criteria** - "Definition of Done" for each task
   - Must reference the specific section of PLANNING_AGENT_PROMPT.md
   - Must be testable/verifiable
   - Example: "Given: user answers question with follow-ups, When: all follow-ups pass, Then: box promotes"

3. **Traceability** - Each task must link:
   - Task → Planning Document Section → Expected Behavior → Test Case

**Template for ROADMAP.md tasks:**
```markdown
| Task ID | Task | Acceptance Criteria | Planning Reference |
|---------|------|-------------------|-------------------|
| T2.4 | Implement follow-up generation & evaluation | 1. Follow-ups generate ✅ 2. Each follow-up evaluated by LLM ✅ 3. Box level updates after ALL follow-ups complete ✅ | PLANNING_AGENT_PROMPT.md lines 1047-1079 |
```

---

## Enhanced Reviewer Responsibilities

The Reviewer Agent MUST verify:

1. **Code Quality** (original scope)
   - Tests pass
   - Type checks pass
   - Clean code principles

2. **Planning Compliance** (NEW - REQUIRED)
   - Implementation matches PLANNING_AGENT_PROMPT.md behavior
   - All acceptance criteria from ROADMAP.md are met
   - Edge cases specified in planning are handled
   - API contracts match API.md specification

3. **Behavioral Verification** (NEW - REQUIRED)
   - Manual test scenarios work as specified
   - User flows match the planning document
   - Business rules (Leitner, auth, etc.) are implemented correctly

**Reviewer Checklist Before Approval:**
- [ ] All tests pass
- [ ] Type checks pass
- [ ] Each task's acceptance criteria verified
- [ ] Planning document requirements met
- [ ] Manual test scenarios pass
- [ ] No regression of existing features

---

## API Documentation

See `API.md` for complete endpoint specification.

---

## Database Schema

See `prisma/schema.prisma` for complete database schema.

---

## Supabase Connection

### Connection String Format

**CRITICAL:** Use the correct Supabase pooler connection format:

```env
# Connection Pooling (for app queries)
DATABASE_URL="postgresql://postgres.{project_ref}:{PASSWORD_URL_ENCODED}@aws-1-{region}.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres.{project_ref}:{PASSWORD_URL_ENCODED}@aws-1-{region}.pooler.supabase.com:5432/postgres"
```

**Key points:**
- User format: `postgres.{project_ref}` (e.g., `postgres.yjxclueysajnxiyudwxn`)
- Host: `aws-1-{region}.pooler.supabase.com` (NOT `db.{project_ref}.supabase.co`)
- Password MUST be URL-encoded (e.g., `!` → `%21`)
- Port 6543 for pooler, 5432 for direct
- `pgbouncer=true` for pooler connection

**Prisma schema must include both:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Troubleshooting

If `prisma db pull` fails:
1. Verify hostname: `nslookup aws-1-eu-central-1.pooler.supabase.com`
2. Check password is URL-encoded
3. Ensure both DATABASE_URL and DIRECT_URL are set
4. Get correct connection strings from: https://supabase.com/dashboard/project/{ref}/settings/database

---

## Roadmap

See `ROADMAP.md` for phase-by-phase implementation plan.
