# Supervisor Handoff: Phase 2 → Phase 3

**Date:** 2025-03-24
**From:** Supervisor Agent (Phase 2 completion)
**To:** Fresh Supervisor Agent (Phase 3)
**Reason:** Context window management - starting fresh for Phase 3

---

## Current State

### Completed Milestones

| Phase | Status | Commit |
|-------|--------|--------|
| Phase 1: Foundation | ✅ Complete | `53f7be8` |
| Phase 2: LLM Integration | ✅ Complete | `f8edd32` |

### Current Branch

- **Main branch:** `main` - Contains Phase 1 + Phase 2 merged
- **All changes pushed to:** `github.com:kevsaba/space-repetition-tutor.git`

---

## Phase 3: Interview Mode

### Goal

Implement structured interview preparation with career tracks and ordered topic progression.

### Key Requirements (from ROADMAP.md)

**Backend Tasks:**
| Task ID | Task | Dependencies |
|---------|------|--------------|
| T3.1 | Create Career and CareerTopic models | None |
| T3.2 | Implement career track seed data | T3.1 |
| T3.3 | Create session management (FREE vs INTERVIEW) | T3.1 |
| T3.4 | Implement interview question orchestration | T3.3 |
| T3.5 | Add API routes for career management | T3.2 |
| T3.6 | Add API routes for interview sessions | T3.4 |

**Frontend Tasks:**
| Task ID | Task | Dependencies |
|---------|------|--------------|
| T3.7 | Create career selection UI | T3.2 |
| T3.8 | Create interview session UI | T3.4 |
| T3.9 | Add interview progress tracking | T3.8 |
| T3.10 | Implement follow-up flow for interview mode | T2.10 |

**Reviewer Tasks:**
| Task ID | Task | Dependencies |
|---------|------|--------------|
| T3.11 | Test career track assignment | T3.2 |
| T3.12 | Test interview session flow | T3.4 |
| T3.13 | Test follow-up relevance in interview mode | T3.10 |

---

## Important Context

### Database Schema Already Exists

The `Career` and `CareerTopic` models are already defined in `prisma/schema.prisma`:
- `Career` (id, name, description)
- `CareerTopic` (links careers to topics with order)
- `UserCareer` (user's active career track)

### Session Model Already Exists

The `Session` model is already defined with:
- `mode`: FREE or INTERVIEW
- `status`: IN_PROGRESS, COMPLETED, ABANDONED
- `careerId`: for interview mode sessions

### LLM Integration Complete

LLM service is fully functional:
- `llmService.evaluateAnswer()` - for original questions
- `llmService.evaluateFollowUp()` - for follow-ups
- `llmService.generateQuestions()` - for new questions
- `llmService.generateFollowUp()` - for follow-up generation

API endpoint: `https://aikeys.maibornwolff.de/v1`
Model: `gpt-4o-mini`
Header: `x-litellm-api-key`

---

## Acceptance Criteria for Phase 3

Each task MUST include:

1. **Acceptance Criteria** (testable "Definition of Done")
2. **Reference to PLANNING_AGENT_PROMPT.md** section
3. **Manual test scenario**

---

## Process Rules (CRITICAL)

### 1. Task Definition
- EVERY task must have unambiguous name
- EVERY task must have acceptance criteria
- EVERY task must reference planning document

### 2. Reviewer Responsibilities
- Check code quality ✅
- **Check planning compliance** ✅ NEW
- **Verify behavioral requirements** ✅ NEW

### 3. Context Handoff
- If approaching 80% context → write HANDOFF.md
- Spawn fresh agent of same type
- Self-terminate

---

## Files to Read First

1. `/Users/kevin.sabatino/space-repetition-tutor/ROADMAP.md` - Phase 3 tasks
2. `/Users/kevin.sabatino/space-repetition-tutor/PLANNING_AGENT_PROMPT.md` - Full spec
3. `/Users/kevin.sabatino/space-repetition-tutor/CLAUDE.md` - Process rules
4. `/Users/kevin.sabatino/space-repetition-tutor/prisma/schema.prisma` - Data model
5. `/Users/kevin.sabatino/space-repetition-tutor/API.md` - API spec

---

## What NOT to Do

- ❌ Don't re-implement Phase 1 or 2 features
- ❌ Don't break backward compatibility with FREE mode
- ❌ Don't skip acceptance criteria for tasks
- ❌ Don't let LLM decide Leitner transitions (still deterministic)
- ❌ Don't merge to main without user approval

---

## Next Steps for New Supervisor

1. Read the planning documents (above list)
2. Announce "🎯 STARTING MILESTONE: Phase 3 - Interview Mode"
3. Break down Phase 3 tasks with acceptance criteria
4. Spawn Backend + Frontend agents in parallel
5. Monitor progress and handle context handoffs
6. After Reviewer approval → Request USER approval
7. Cleanup and proceed to Phase 4

---

## Violation Log

### 2025-03-24 - Missing Feature Implementation (Follow-up Evaluation)
**Issue:** Follow-up evaluation specified in planning doc but not implemented
**Fix:** Implemented in Phase 2
**Rule Update:** Added "Task Definition Requirements" and "Enhanced Reviewer Responsibilities" to CLAUDE.md

---

**Status:** Ready for Phase 3 to begin.
**Self-terminating now.**
