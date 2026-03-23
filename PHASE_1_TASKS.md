# Phase 1 Task Breakdown - Foundation (MVP)

**Status:** Not Started
**Last Updated:** 2025-03-23

---

## Overview

Phase 1 establishes the foundation of the Space Repetition Tutor. This includes database setup, core Leitner algorithm, authentication, and basic question flow.

**Goal:** Core Leitner engine working end-to-end

**Success Criteria:**
- User can register and login
- User sees due questions (or new questions if none due)
- User can submit answers
- Box level updates deterministically based on pass/fail
- Next review date calculated correctly
- All tests pass (unit, integration, E2E)

---

## Backend Tasks

### T1.1: Initialize Prisma and Create First Migration

**Agent:** Backend
**Estimated Tokens:** 5,000
**Dependencies:** None

**Description:**
- Generate Prisma client
- Create initial migration from schema
- Set up database connection

**Steps:**
1. Run `npx prisma generate`
2. Run `npx prisma migrate dev --name init`
3. Verify migration created in `prisma/migrations/`
4. Test connection with `npx prisma studio`

**Output Files:**
- `prisma/migrations/YYYYMMDDHHMMSS_init/migration.sql`
- Generated Prisma client in `node_modules/.prisma/client`

**Definition of Done:**
- Migration runs successfully
- Database tables created
- Prisma Client generates without errors

---

### T1.2: Create LeitnerService with Box Transition Logic

**Agent:** Backend
**Estimated Tokens:** 8,000
**Dependencies:** T1.1

**Description:**
Create the core Leitner algorithm service that handles:
- Box transition logic (deterministic)
- Due date calculation
- Fetch priority

**Implementation File:** `lib/services/leitner.service.ts`

**Interface:**

```typescript
interface LeitnerService {
  calculateNewBox(currentBox: number, passed: boolean): number;
  calculateNextDueDate(box: number): Date;
  shouldPromote(currentBox: number, passed: boolean): boolean;
}
```

**Algorithm:**

```typescript
function calculateNewBox(currentBox: number, passed: boolean): number {
  if (passed) {
    return Math.min(currentBox + 1, 3);
  }
  return 1;
}

function calculateNextDueDate(box: number): Date {
  const days = box === 1 ? 1 : box === 2 ? 3 : 7;
  return addDays(new Date(), days);
}
```

**Definition of Done:**
- Service created with all three methods
- Unit tests cover all box transitions (1→2, 2→3, 3→3, any→1)
- Due date calculation verified for all box levels
- No LLM involvement in box transitions (purely deterministic)

---

### T1.3: Create QuestionService (Fetch Due Questions)

**Agent:** Backend
**Estimated Tokens:** 12,000
**Dependencies:** T1.2

**Description:**
Create service to fetch due questions for a user, prioritizing Box 1 → Box 2 → Box 3.

**Implementation File:** `lib/services/question.service.ts`

**Interface:**

```typescript
interface QuestionService {
  fetchDueQuestions(userId: string, sessionId: string, limit?: number): Promise<FetchDueQuestionsOutput>;
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
  isNew: boolean;
}
```

**Algorithm:**

1. Fetch UserQuestions where `dueDate <= now()` and `userId = userId`
2. Order by: `box ASC`, `dueDate ASC`, `lastSeenAt ASC`
3. Take `limit` (default 5)
4. If not enough, create new questions (see note below)
5. Return questions + whether more are available

**Note on New Questions:**
For v1 Phase 1 (before LLM integration in Phase 2), use seed data. Create template questions in migration.

**Definition of Done:**
- Service fetches due questions with correct priority order
- Returns new questions when not enough due questions
- Creates UserQuestion entries for new questions
- `hasNewQuestionsAvailable` flag works correctly
- Unit tests for all branches

---

### T1.4: Create AuthService (Simple Username/Password)

**Agent:** Backend
**Estimated Tokens:** 10,000
**Dependencies:** None

**Description:**
Create authentication service with simple username/password. Designed for easy replacement.

**Implementation File:** `lib/services/auth.service.ts`

**Interface:**

```typescript
interface AuthService {
  register(username: string, password: string): Promise<User>;
  login(username: string, password: string): Promise<{ user: User; token: string }>;
  verifyToken(token: string): Promise<User>;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
}
```

**Requirements:**
- Use bcrypt for password hashing
- Use JWT for tokens (httpOnly cookie storage)
- Store password hash only (never plaintext)
- Designed for easy swap to OAuth/magic-link later

**Definition of Done:**
- Password hashing with bcrypt (salt rounds: 10)
- JWT token generation and verification
- User registration creates new user
- Login validates credentials
- Unit tests for all methods

---

### T1.5: Create API Routes - Auth (Login, Register)

**Agent:** Backend
**Estimated Tokens:** 10,000
**Dependencies:** T1.4

**Description:**
Create API endpoints for authentication.

**Implementation Files:**
- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`

**Routes:**

**POST /api/auth/register**
```typescript
// Request body
{ username: string; password: string }

// Response (201)
{ user: { id: string; username: string; createdAt: Date } }

// Errors
400 - Invalid input
409 - Username exists
500 - Server error
```

**POST /api/auth/login**
```typescript
// Request body
{ username: string; password: string }

// Response (200)
{ user: { id: string; username: string; createdAt: Date } }

// Set-Cookie
auth_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800

// Errors
400 - Invalid input
401 - Invalid credentials
500 - Server error
```

**POST /api/auth/logout**
```typescript
// Response (200)
{ success: true }

// Set-Cookie (clear)
auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

**GET /api/auth/me**
```typescript
// Response (200)
{ user: { id: string; username: string; createdAt: Date } }

// Errors
401 - Not authenticated
```

**Definition of Done:**
- All four routes implemented
- Request validation with Zod
- Error handling with proper HTTP status codes
- JWT token set in httpOnly cookie
- Unit tests with MockMvc

---

### T1.6: Create API Routes - Questions (Fetch, Submit)

**Agent:** Backend
**Estimated Tokens:** 15,000
**Dependencies:** T1.2, T1.3

**Description:**
Create API endpoints for question flow (fetch, submit answer).

**Implementation Files:**
- `app/api/questions/due/route.ts`
- `app/api/questions/[userQuestionId]/answer/route.ts`

**Routes:**

**GET /api/questions/due?limit=5&sessionId=xxx**
```typescript
// Response (200)
{
  questions: [
    {
      id: string;
      content: string;
      topic: { id: string; name: string; category: string; track: Track };
      box: number;
      timesSeen: number;
      isNew: boolean;
      type: QuestionType;
      difficulty: Difficulty;
    }
  ];
  hasNewQuestionsAvailable: boolean;
  sessionId: string;
}

// Errors
401 - Not authenticated
500 - Server error
```

**POST /api/questions/[userQuestionId]/answer**
```typescript
// Request body
{ answer: string; mode: 'FREE' | 'INTERVIEW'; sessionId?: string }

// Response (200) - Phase 1 only (before LLM)
{
  passed: boolean; // For now, always true (LLM evaluation in Phase 2)
  newBox: number;
  nextDueDate: Date;
  followUpQuestions: []; // Empty in Phase 1
}

// Errors
400 - Invalid input
401 - Not authenticated
404 - UserQuestion not found
500 - Server error
```

**Phase 1 Notes:**
- For Phase 1, `passed` always returns `true` (LLM evaluation comes in Phase 2)
- `feedback` is empty object in Phase 1
- `followUpQuestions` is empty array in Phase 1

**Definition of Done:**
- Fetch endpoint returns due questions with correct priority
- Submit endpoint updates UserQuestion (box, dueDate, lastSeenAt)
- Creates Answer record
- Error handling with proper HTTP status codes
- Unit tests with mocked services

---

### T1.7: Implement Seed Data (Template Topics/Questions)

**Agent:** Backend
**Estimated Tokens:** 8,000
**Dependencies:** T1.1

**Description:**
Create seed data for template topics and questions.

**Implementation File:** `prisma/seed.ts`

**Topics to Seed:**
- Java Concurrency (track: JAVA)
- Java Collections Framework (track: JAVA)
- REST API Design (track: JAVA)
- Database Design (track: GENERAL)
- System Design Basics (track: DISTRIBUTED_SYSTEMS)

**Questions to Seed:**
At least 3 questions per topic (15 total questions).

**Add to package.json:**
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

**Run seed:**
```bash
npx prisma db seed
```

**Definition of Done:**
- Seed script creates 5 topics
- Seed script creates 15+ questions (3 per topic)
- Seed runs successfully
- Data verified in Prisma Studio

---

## Frontend Tasks

### T1.8: Set Up React Context for Auth State

**Agent:** Frontend
**Estimated Tokens:** 6,000
**Dependencies:** None

**Description:**
Create React Context for managing authentication state across the app.

**Implementation File:** `lib/contexts/AuthContext.tsx`

**Interface:**

```typescript
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface User {
  id: string;
  username: string;
  createdAt: Date;
}
```

**Features:**
- Fetch current user on mount (`/api/auth/me`)
- Provide login, register, logout methods
- Update user state on auth changes
- Handle loading states

**Definition of Done:**
- AuthContext created and exported
- Provider wraps app (layout.tsx)
- User state updates correctly on login/logout
- Loading states handled
- Basic unit tests

---

### T1.9: Create Login/Signup Pages

**Agent:** Frontend
**Estimated Tokens:** 10,000
**Dependencies:** T1.8

**Description:**
Create login and signup pages with forms.

**Implementation Files:**
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `components/AuthForm.tsx` (shared component)

**Features:**
- Username/password input fields
- Form validation (client-side)
- Error message display
- Loading states
- Link to switch between login/signup
- Redirect on success

**Styling:**
- Use Tailwind CSS
- Clean, simple design
- Responsive (mobile-friendly)

**Definition of Done:**
- Login page working
- Signup page working
- Form validation works
- Error messages display correctly
- Redirects on successful auth
- Manual browser testing passed

---

### T1.10: Create Question Display Component

**Agent:** Frontend
**Estimated Tokens:** 8,000
**Dependencies:** None

**Description:**
Create component to display a question to the user.

**Implementation File:** `components/QuestionDisplay.tsx`

**Interface:**

```typescript
interface QuestionDisplayProps {
  question: {
    id: string;
    content: string;
    topic: {
      name: string;
      category: string;
      track: Track;
    };
    box: number;
    isNew: boolean;
  };
}
```

**Features:**
- Display question content
- Show topic, category, track
- Show box level (visual indicator)
- Show "New question" badge if applicable

**Styling:**
- Card-style layout
- Clear typography
- Box level color-coded (1=red, 2=yellow, 3=green)

**Definition of Done:**
- Component renders question correctly
- All metadata displayed
- Styled with Tailwind
- Responsive design

---

### T1.11: Create Answer Input Component

**Agent:** Frontend
**Estimated Tokens:** 8,000
**Dependencies:** T1.10

**Description:**
Create component for user to input their answer.

**Implementation File:** `components/AnswerInput.tsx`

**Interface:**

```typescript
interface AnswerInputProps {
  questionId: string;
  mode: 'FREE' | 'INTERVIEW';
  sessionId: string;
  onSubmit: (answer: string) => Promise<void>;
  loading: boolean;
}
```

**Features:**
- Textarea for answer input
- Character count
- Submit button
- Loading state
- Validation (not empty)

**Styling:**
- Large, comfortable textarea
- Clear submit button
- Loading indicator

**Definition of Done:**
- Component renders correctly
- Textarea accepts input
- Submit button triggers callback
- Validation works
- Loading state shows
- Styled with Tailwind

---

### T1.12: Create Feedback Display Component

**Agent:** Frontend
**Estimated Tokens:** 10,000
**Dependencies:** None

**Description:**
Create component to display feedback after answer submission.

**Implementation File:** `components/FeedbackDisplay.tsx`

**Interface:**

```typescript
interface FeedbackDisplayProps {
  passed: boolean;
  newBox: number;
  nextDueDate: Date;
  feedback?: Feedback; // Optional in Phase 1
  onNext: () => void;
  loading: boolean;
}
```

**Phase 1 Implementation:**
- Show pass/fail indicator
- Show new box level
- Show next review date
- "Next Question" button
- (Skip detailed feedback for Phase 1 - comes in Phase 2)

**Definition of Done:**
- Component renders correctly
- Shows pass/fail clearly
- Shows box transition
- Shows next due date
- Next button works
- Styled with Tailwind

---

## Integration Tasks

### T1.13: End-to-End Flow Integration

**Agent:** Backend + Frontend (collaborative)
**Estimated Tokens:** 12,000
**Dependencies:** T1.1-T1.12

**Description:**
Integrate all components into working end-to-end flow.

**Flow:**
1. User lands on home page (not logged in)
2. User clicks "Sign up"
3. User fills signup form and submits
4. User redirected to login page
5. User logs in
6. User sees their first question
7. User submits answer
8. User sees feedback (pass, new box, next due date)
9. User clicks "Next question"
10. User sees next question

**Implementation:**
- Create home page (`app/page.tsx`)
- Create study page (`app/study/page.tsx`)
- Wire up all API calls
- Handle state transitions
- Manage navigation

**Definition of Done:**
- Full flow works end-to-end
- No console errors
- No network errors
- State persists correctly
- Questions fetch successfully
- Answers submit successfully
- Box updates correctly
- Manual browser testing passed

---

## Reviewer Tasks

### T1.14: Unit Tests for Leitner Algorithm

**Agent:** Reviewer
**Estimated Tokens:** 6,000
**Dependencies:** T1.2

**Description:**
Write comprehensive unit tests for Leitner algorithm.

**Test File:** `lib/services/__tests__/leitner.service.test.ts`

**Test Cases:**

**calculateNewBox():**
- Box 1, passed → Box 2
- Box 2, passed → Box 3
- Box 3, passed → Box 3 (max)
- Box 1, failed → Box 1
- Box 2, failed → Box 1
- Box 3, failed → Box 1

**calculateNextDueDate():**
- Box 1 → +1 day
- Box 2 → +3 days
- Box 3 → +7 days
- Handles month boundaries correctly
- Handles leap years correctly

**Definition of Done:**
- All test cases pass
- Edge cases covered
- No mocked dependencies (pure functions)

---

### T1.15: Unit Tests for Auth Service

**Agent:** Reviewer
**Estimated Tokens:** 8,000
**Dependencies:** T1.4

**Description:**
Write unit tests for auth service.

**Test File:** `lib/services/__tests__/auth.service.test.ts`

**Test Cases:**

**hashPassword():**
- Hashes password with bcrypt
- Different passwords produce different hashes
- Same password produces different hashes (salt)
- Hash can be verified

**verifyPassword():**
- Correct password returns true
- Incorrect password returns false

**register():**
- Creates new user
- Hashes password before storing
- Throws error for duplicate username

**login():**
- Returns user and token for valid credentials
- Throws error for invalid username
- Throws error for invalid password

**verifyToken():**
- Returns user for valid token
- Throws error for invalid token

**Definition of Done:**
- All test cases pass
- Prisma mocked for database calls
- bcrypt mocked for hashing/verification

---

### T1.16: Integration Tests for API

**Agent:** Reviewer
**Estimated Tokens:** 10,000
**Dependencies:** T1.5, T1.6

**Description:**
Write integration tests for API endpoints.

**Test File:** `app/api/__tests__/integration.test.ts`

**Test Cases:**

**Auth endpoints:**
- Register new user → 201
- Register duplicate user → 409
- Login with valid credentials → 200
- Login with invalid credentials → 401
- Get /me with auth → 200
- Get /me without auth → 401

**Question endpoints:**
- Get due questions with auth → 200
- Get due questions without auth → 401
- Submit answer with auth → 200
- Submit answer without auth → 401

**Definition of Done:**
- All test cases pass
- Uses test database
- Cleans up test data between tests
- Tests full request/response cycle

---

### T1.17: E2E Tests with Playwright

**Agent:** Reviewer
**Estimated Tokens:** 12,000
**Dependencies:** T1.13

**Description:**
Write end-to-end tests with Playwright.

**Test File:** `e2e/study-flow.spec.ts`

**Test Cases:**

**Study flow:**
1. Navigate to home page
2. Click "Sign up"
3. Fill signup form
4. Submit
5. Redirect to login
6. Fill login form
7. Submit
8. Verify logged in (see username)
9. Navigate to study page
10. Verify question displayed
11. Type answer
12. Submit
13. Verify feedback displayed
14. Click "Next question"
15. Verify next question displayed

**Definition of Done:**
- Playwright installed and configured
- Test runs successfully
- Tests full user flow
- Reliable (not flaky)

---

## Phase 1 Completion Checklist

Before requesting user approval, verify:

### Code Quality
- [ ] All tests pass (unit + integration + E2E)
- [ ] No compiler warnings
- [ ] No TODO comments in production code
- [ ] Code follows existing patterns

### Testing Complete
- [ ] Unit tests for Leitner algorithm
- [ ] Unit tests for auth service
- [ ] Integration tests for API
- [ ] E2E tests with Playwright
- [ ] Manual browser testing passed

### Documentation
- [ ] CLAUDE.md created
- [ ] API.md created
- [ ] ROADMAP.md created
- [ ] Prisma schema finalized

### Git Readiness
- [ ] On feature branch (NOT main)
- [ ] Changes committed to branch
- [ ] Branch pushed to remote
- [ ] Ready to display changes for review

---

## Phase 1 Deliverables Summary

| Deliverable | File/Path | Status |
|-------------|-----------|--------|
| Prisma Schema | `prisma/schema.prisma` | ✅ |
| Initial Migration | `prisma/migrations/*/init/migration.sql` | ⏳ |
| Leitner Service | `lib/services/leitner.service.ts` | ⏳ |
| Question Service | `lib/services/question.service.ts` | ⏳ |
| Auth Service | `lib/services/auth.service.ts` | ⏳ |
| Auth API Routes | `app/api/auth/**/route.ts` | ⏳ |
| Question API Routes | `app/api/questions/**/route.ts` | ⏳ |
| Seed Data | `prisma/seed.ts` | ⏳ |
| Auth Context | `lib/contexts/AuthContext.tsx` | ⏳ |
| Login/Signup Pages | `app/login/page.tsx`, `app/signup/page.tsx` | ⏳ |
| Question Display | `components/QuestionDisplay.tsx` | ⏳ |
| Answer Input | `components/AnswerInput.tsx` | ⏳ |
| Feedback Display | `components/FeedbackDisplay.tsx` | ⏳ |
| Home Page | `app/page.tsx` | ⏳ |
| Study Page | `app/study/page.tsx` | ⏳ |
| Unit Tests | `lib/services/__tests__/*.test.ts` | ⏳ |
| Integration Tests | `app/api/__tests__/*.test.ts` | ⏳ |
| E2E Tests | `e2e/*.spec.ts` | ⏳ |

**Legend:** ✅ Complete | ⏳ Pending

---

**End of Phase 1 Task Breakdown**
