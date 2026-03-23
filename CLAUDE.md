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

1. **NEVER merge to main without user approval**
2. **NEVER let LLM decide Leitner box transitions**
3. **NEVER put business logic in controllers**
4. **NEVER skip tests**
5. **ALWAYS use type safety (no `any` escapes)**
6. **ALWAYS handle context limits with handoffs**
7. **ALWAYS work on feature branches, never main**
8. **ALWAYS document violations in CLAUDE.md**

---

## Violation Log

*No violations recorded yet.*

---

## API Documentation

See `API.md` for complete endpoint specification.

---

## Database Schema

See `prisma/schema.prisma` for complete database schema.

---

## Roadmap

See `ROADMAP.md` for phase-by-phase implementation plan.
