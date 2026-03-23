# Space Repetition Tutor - Implementation Roadmap

**Version:** 1.3
**Last Updated:** 2025-03-23

---

## Overview

This roadmap breaks down the implementation of the Space Repetition Tutor into phases. Each phase represents a milestone that requires user approval before proceeding.

**Phases Summary:**
- **Phase 1:** Foundation (MVP) - Core Leitner engine working end-to-end
- **Phase 2:** LLM Integration - AI-powered question generation and evaluation
- **Phase 3:** Interview Mode - Structured interview preparation
- **Phase 4:** Polish & Minimal Dashboard - Box distribution stats
- **Phase 5:** Future Features (Out of Scope for v1)

---

## Phase 1: Foundation (MVP)

**Goal:** Core Leitner engine working end-to-end

### Backend Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T1.1 | Initialize Prisma and create first migration | Backend | None |
| T1.2 | Create LeitnerService with box transition logic | Backend | T1.1 |
| T1.3 | Create QuestionService (fetch due questions) | Backend | T1.2 |
| T1.4 | Create AuthService (simple username/password) | Backend | None |
| T1.5 | Create API routes: auth (login, register) | Backend | T1.4 |
| T1.6 | Create API routes: questions (fetch, submit) | Backend | T1.2, T1.3 |
| T1.7 | Implement seed data (template topics/questions) | Backend | T1.1 |

### Frontend Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T1.8 | Set up React Context for auth state | Frontend | None |
| T1.9 | Create login/signup pages | Frontend | T1.8 |
| T1.10 | Create question display component | Frontend | None |
| T1.11 | Create answer input component | Frontend | T1.10 |
| T1.12 | Create feedback display component | Frontend | None |

### Integration Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T1.13 | End-to-end flow: login → question → answer → feedback → box update | Backend+Frontend | All above |

### Reviewer Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T1.14 | Unit tests for Leitner algorithm | Reviewer | T1.2 |
| T1.15 | Unit tests for auth service | Reviewer | T1.4 |
| T1.16 | Integration tests for API | Reviewer | T1.6 |
| T1.17 | E2E tests with Playwright | Reviewer | T1.13 |

### Deliverables

- ✅ Prisma schema with migrations
- ✅ Leitner algorithm service (deterministic box transitions)
- ✅ Auth flow (login/signup)
- ✅ Question fetch/submit endpoints
- ✅ Basic UI for answering questions
- ✅ All tests passing
- ✅ End-to-end: login → see question → answer → get feedback → box updates

**Success Criteria:**
- User can register and login
- User sees due questions (or new questions if none due)
- User can submit answers
- Box level updates deterministically based on pass/fail
- Next review date calculated correctly
- All tests pass (unit, integration, E2E)

---

## Phase 2: LLM Integration

**Goal:** AI-powered question generation and answer evaluation

### Backend Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T2.1 | Create LLMService base class | Backend | None |
| T2.2 | Implement question generation via LLM | Backend | T2.1 |
| T2.3 | Implement answer evaluation via LLM | Backend | T2.1 |
| T2.4 | Implement follow-up question generation | Backend | T2.2, T2.3 |
| T2.5 | Add retry logic and fallback handling | Backend | T2.1 |
| T2.6 | Update QuestionService to use LLM for new questions | Backend | T2.2 |
| T2.7 | Update LeitnerService to use LLM for evaluation | Backend | T2.3 |

### Frontend Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T2.8 | Add loading states for LLM calls | Frontend | None |
| T2.9 | Add error handling for LLM failures | Frontend | T2.8 |
| T2.10 | Create follow-up question flow UI | Frontend | T2.4 |

### Reviewer Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T2.11 | Create mock LLM for tests | Reviewer | T2.1 |
| T2.12 | Contract tests for LLM responses | Reviewer | T2.2, T2.3 |
| T2.13 | Integration tests with real LLM (optional) | Reviewer | T2.7 |

### Deliverables

- ✅ LLM service with LiteLLM-compatible interface
- ✅ Prompt templates for evaluation, question generation, follow-ups
- ✅ Structured response parsing with validation
- ✅ Retry logic with exponential backoff
- ✅ Loading states and error handling in UI
- ✅ Follow-up question flow
- ✅ All tests passing

**Success Criteria:**
- LLM generates relevant questions on requested topics
- LLM evaluates answers with structured feedback
- Follow-up questions are contextually relevant
- System handles LLM failures gracefully
- Mock LLM works in tests

---

## Phase 3: Interview Mode

**Goal:** Structured interview preparation with career tracks

### Backend Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T3.1 | Create Career and CareerTopic models | Backend | None |
| T3.2 | Implement career track seed data | Backend | T3.1 |
| T3.3 | Create session management (FREE vs INTERVIEW) | Backend | T3.1 |
| T3.4 | Implement interview question orchestration | Backend | T3.3 |
| T3.5 | Add API routes for career management | Backend | T3.2 |
| T3.6 | Add API routes for interview sessions | Backend | T3.4 |

### Frontend Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T3.7 | Create career selection UI | Frontend | T3.2 |
| T3.8 | Create interview session UI | Frontend | T3.4 |
| T3.9 | Add interview progress tracking | Frontend | T3.8 |
| T3.10 | Implement follow-up flow for interview mode | Frontend | T2.10 |

### Reviewer Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T3.11 | Test career track assignment | Reviewer | T3.2 |
| T3.12 | Test interview session flow | Reviewer | T3.4 |
| T3.13 | Test follow-up relevance in interview mode | Reviewer | T3.10 |

### Deliverables

- ✅ Career track entities and seed data
- ✅ Session management (FREE vs INTERVIEW modes)
- ✅ Interview question orchestration
- ✅ Career selection UI
- ✅ Interview session UI with progress tracking
- ✅ Follow-up flow integrated into interview mode
- ✅ All tests passing

**Success Criteria:**
- User can select a career track
- Interview mode follows career topic order
- Session tracks progress across topics
- Follow-ups work in both FREE and INTERVIEW modes

---

## Phase 4: Polish & Minimal Dashboard

**Goal:** Box distribution stats and performance optimization

### Backend Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T4.1 | Create box distribution query | Backend | None |
| T4.2 | Add API endpoint for stats | Backend | T4.1 |
| T4.3 | Performance optimization (indexes, queries) | Backend | None |

### Frontend Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T4.4 | Create simple dashboard page | Frontend | T4.2 |
| T4.5 | Display box distribution | Frontend | T4.4 |
| T4.6 | Add visual polish and responsiveness | Frontend | None |

### Reviewer Tasks

| Task ID | Task | Agent | Dependencies |
|---------|------|-------|--------------|
| T4.7 | Load testing | Reviewer | T4.3 |
| T4.8 | Performance benchmarks | Reviewer | T4.3 |

### Deliverables

- ✅ Box distribution query (count per box)
- ✅ Stats API endpoint
- ✅ Simple dashboard showing:
  - Box 1: X questions (review daily)
  - Box 2: Y questions (review every 3 days)
  - Box 3: Z questions (review weekly)
- ✅ Performance optimizations
- ✅ Load test results

**Success Criteria:**
- Dashboard accurately shows box distribution
- Stats query is performant (< 100ms)
- System handles 100 concurrent users
- UI is responsive on mobile and desktop

---

## Phase 5: Future Features (Out of Scope for v1)

These features are planned for future versions and are NOT part of v1 MVP:

- [ ] Coding questions with code execution
- [ ] System design questions with diagram support
- [ ] Gamification (XP, levels, achievements, streaks)
- [ ] Social features (shared templates, leaderboards)
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Spaced repetition analytics (retention curves, optimal intervals)
- [ ] Voice input for answers
- [ ] Image/diagram support in questions

---

## Dependencies Between Phases

```
Phase 1 (Foundation)
    ↓
Phase 2 (LLM Integration) ← depends on Phase 1
    ↓
Phase 3 (Interview Mode) ← depends on Phase 1, Phase 2
    ↓
Phase 4 (Polish & Dashboard) ← depends on Phase 1, Phase 2, Phase 3
```

**Parallel Work Opportunities:**

- Phase 1: Backend (T1.1-T1.7) and Frontend (T1.8-T1.12) can be done in parallel
- Phase 2: Backend (T2.1-T2.7) and Frontend (T2.8-T2.10) can be partially parallel
- Phase 3: Backend (T3.1-T3.6) and Frontend (T3.7-T3.9) can be partially parallel

---

## Estimated Complexity

| Phase | Backend Tasks | Frontend Tasks | Integration Tasks | Reviewer Tasks | Total Tasks |
|-------|---------------|----------------|-------------------|----------------|-------------|
| Phase 1 | 7 | 5 | 1 | 4 | 17 |
| Phase 2 | 7 | 3 | 0 | 3 | 13 |
| Phase 3 | 6 | 4 | 0 | 3 | 13 |
| Phase 4 | 3 | 3 | 0 | 2 | 8 |
| **Total** | **23** | **15** | **1** | **12** | **51** |

---

## Notes

- **Intentionally minimal stats** - Focus is on learning science, not gamification
- **LLM quality matters** - Invest in good prompt engineering
- **Test coverage is mandatory** - Every feature must have tests
- **User approval gates** - Each phase requires explicit user approval before proceeding
- **Context window management** - Agents should hand off when approaching token limits

---

**End of Roadmap**
