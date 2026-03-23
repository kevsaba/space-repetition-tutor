# Space Repetition Tutor - API Specification

**Version:** 1.0
**Base URL:** `http://localhost:3000/api`

---

## Authentication

### Overview

Simple username/password authentication for v1. Auth token stored in httpOnly cookie.

**Future:** Upgrade to Supabase Auth (OAuth, magic links, etc.)

---

## Endpoints

### Auth Endpoints

#### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "username": "string (3-30 characters, alphanumeric)",
  "password": "string (min 8 characters)"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "string (cuid)",
    "username": "string",
    "createdAt": "ISO 8601 date"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid input
- `409 Conflict` - Username already exists
- `500 Internal Server Error` - Server error

---

#### POST /api/auth/login

Login with username and password.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "string (cuid)",
    "username": "string",
    "createdAt": "ISO 8601 date"
  }
}
```

**Set-Cookie:** `auth_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`

**Errors:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Server error

---

#### POST /api/auth/logout

Logout and clear auth token.

**Response (200 OK):**
```json
{
  "success": true
}
```

**Set-Cookie:** `auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0`

---

#### GET /api/auth/me

Get current authenticated user.

**Response (200 OK):**
```json
{
  "user": {
    "id": "string (cuid)",
    "username": "string",
    "createdAt": "ISO 8601 date"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated

---

### Question Endpoints

#### GET /api/questions/due

Fetch due questions for the authenticated user.

**Query Parameters:**
- `limit` (optional, default: 5) - Number of questions to return
- `sessionId` (optional) - Session ID for tracking

**Response (200 OK):**
```json
{
  "questions": [
    {
      "id": "string (cuid)",
      "content": "string",
      "topic": {
        "id": "string",
        "name": "string",
        "category": "string",
        "track": "JAVA | PYTHON | DISTRIBUTED_SYSTEMS | GENERAL"
      },
      "box": 1,
      "timesSeen": 0,
      "isNew": true,
      "type": "CONCEPTUAL",
      "difficulty": "JUNIOR | MID | SENIOR"
    }
  ],
  "hasNewQuestionsAvailable": false,
  "sessionId": "string (cuid)"
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

**Notes:**
- Returns questions in Box 1, 2, 3 order (due first)
- If not enough due questions, generates new questions via LLM
- Creates/updates session if sessionId provided

---

#### POST /api/questions/:userQuestionId/answer

Submit an answer for a question.

**Request:**
```json
{
  "answer": "string (user's answer text)",
  "mode": "FREE | INTERVIEW",
  "sessionId": "string (cuid, optional)"
}
```

**Response (200 OK):**
```json
{
  "passed": true,
  "feedback": {
    "evaluation": "string - what they got right",
    "higherLevelArticulation": "string - how to phrase at senior level",
    "correction": "string - misconceptions to correct",
    "failureTimeline": "string - what goes wrong without this knowledge",
    "interviewReadyAnswer": "string - 2-3 sentence polished answer",
    "analogy": "string - memorable analogy",
    "productionInsight": "string - how this matters in real systems"
  },
  "newBox": 2,
  "nextDueDate": "2025-03-26T10:00:00Z",
  "followUpQuestions": [
    {
      "id": "string (cuid)",
      "content": "string",
      "reason": "string - why this follow-up is relevant"
    }
  ]
}
```

**Errors:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - UserQuestion not found
- `500 Internal Server Error` - Server error

**Notes:**
- Calls LLM for evaluation
- Updates box deterministically based on `passed` value
- Calculates next due date based on new box
- Records answer in database
- Generates 0-2 follow-up questions

---

#### POST /api/questions/:userQuestionId/followup

Answer a follow-up question.

**Request:**
```json
{
  "followUpId": "string (follow-up question ID)",
  "answer": "string (user's answer text)",
  "sessionId": "string (cuid, optional)"
}
```

**Response (200 OK):**
```json
{
  "passed": true,
  "feedback": {
    "evaluation": "string",
    "higherLevelArticulation": "string",
    "correction": "string",
    "failureTimeline": "string",
    "interviewReadyAnswer": "string",
    "analogy": "string",
    "productionInsight": "string"
  },
  "originalQuestionUpdated": false,
  "followUpComplete": true,
  "remainingFollowUps": 0
}
```

**Notes:**
- Follow-ups are evaluated independently
- If ANY follow-up fails, original question stays in Box 1
- Only when ALL follow-ups pass does original question promote

---

### Session Endpoints

#### POST /api/sessions

Create a new study session.

**Request:**
```json
{
  "mode": "FREE | INTERVIEW",
  "careerId": "string (optional, required for INTERVIEW mode)"
}
```

**Response (201 Created):**
```json
{
  "session": {
    "id": "string (cuid)",
    "mode": "FREE | INTERVIEW",
    "status": "IN_PROGRESS",
    "startedAt": "ISO 8601 date"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid input or careerId missing for INTERVIEW mode
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Career not found

---

#### GET /api/sessions/:sessionId

Get session details.

**Response (200 OK):**
```json
{
  "session": {
    "id": "string (cuid)",
    "mode": "FREE | INTERVIEW",
    "status": "IN_PROGRESS | COMPLETED | ABANDONED",
    "startedAt": "ISO 8601 date",
    "completedAt": "ISO 8601 date or null",
    "career": {
      "id": "string",
      "name": "string"
    } or null
  },
  "progress": {
    "questionsAnswered": 5,
    "questionsPassed": 3,
    "questionsFailed": 2
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated or not owned by user
- `404 Not Found` - Session not found

---

#### POST /api/sessions/:sessionId/complete

Mark a session as completed.

**Response (200 OK):**
```json
{
  "session": {
    "id": "string (cuid)",
    "status": "COMPLETED",
    "completedAt": "ISO 8601 date"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated or not owned by user
- `404 Not Found` - Session not found

---

### Career Endpoints

#### GET /api/careers

List all available career tracks.

**Response (200 OK):**
```json
{
  "careers": [
    {
      "id": "string (cuid)",
      "name": "string",
      "description": "string",
      "topicCount": 15
    }
  ]
}
```

---

#### POST /api/careers/:careerId/select

Select a career track for the user.

**Response (200 OK):**
```json
{
  "userCareer": {
    "id": "string (cuid)",
    "career": {
      "id": "string",
      "name": "string"
    },
    "isActive": true,
    "startedAt": "ISO 8601 date"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Career not found

**Notes:**
- Deactivates any previously active career
- Creates UserCareer assignment

---

#### GET /api/careers/active

Get the user's active career track.

**Response (200 OK):**
```json
{
  "userCareer": {
    "id": "string (cuid)",
    "career": {
      "id": "string",
      "name": "string",
      "description": "string"
    },
    "isActive": true,
    "startedAt": "ISO 8601 date"
  },
  "topics": [
    {
      "id": "string",
      "name": "string",
      "order": 1,
      "questionsDue": 3
    }
  ]
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - No active career found

---

### Stats Endpoints

#### GET /api/stats/box-distribution

Get box distribution for the user.

**Response (200 OK):**
```json
{
  "distribution": {
    "box1": {
      "count": 15,
      "reviewInterval": "1 day",
      "description": "Struggling concepts - review daily"
    },
    "box2": {
      "count": 8,
      "reviewInterval": "3 days",
      "description": "Some mastery - review every 3 days"
    },
    "box3": {
      "count": 22,
      "reviewInterval": "7 days",
      "description": "Well-learned - review weekly"
    }
  },
  "totalQuestions": 45,
  "dueToday": 15
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  }
}
```

**Common Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Not authenticated or invalid credentials |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate username) |
| `QUESTION_NOT_FOUND` | 404 | Question not found |
| `NO_QUESTIONS_DUE` | 404 | No due questions available |
| `LLM_ERROR` | 500 | LLM service error |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limiting

**v1:** No rate limiting (development only)

**Future:** Implement rate limiting:
- Auth endpoints: 5 requests per minute
- Question endpoints: 60 requests per minute
- Other endpoints: 100 requests per minute

---

## CORS

**v1:** Allow all origins (development)

**Future:** Restrict to specific origins in production

---

## Versioning

API versioning via URL path:
- Current: `/api/v1/...`
- Future: `/api/v2/...`

For v1, we use `/api/` directly for simplicity.

---

**End of API Specification**
