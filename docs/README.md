# Space Repetition Tutor - Documentation

Welcome to the documentation for the Space Repetition Tutor project.

## Table of Contents

### User Documentation
- [Strictness Levels](./strictness-level.md) - Understanding the three evaluation modes (LENIENT, DEFAULT, STRICT)

### Developer Documentation

#### Architecture & Setup
- [API Reference](./api.md) - Complete API endpoint documentation
- [Contributing Guide](./contributing.md) - How to contribute to the project
- [Supabase Setup](./SUPABASE_SETUP.md) - Database and authentication setup

#### Reference Documentation
- [Prompts](./reference/prompts/) - LLM prompt templates used in the application
  - [Evaluate Answer Prompt](./reference/prompts/evaluate-answer.md)
  - [Generate Follow-up Prompt](./reference/prompts/generate-followup.md)
  - [Generate Questions Prompt](./reference/prompts/generate-questions.md)

### Project Management (Root Directory)
- [README.md](../README.md) - Project overview and quick start
- [CLAUDE.md](../CLAUDE.md) - AI agent instructions and project guidelines
- [ROADMAP.md](../ROADMAP.md) - Implementation phases and task tracking
- [PLANNING_AGENT_PROMPT.md](../PLANNING_AGENT_PROMPT.md) - Detailed planning specifications

## Quick Links

### For Developers
- **Getting Started:** See [README.md](../README.md)
- **API Endpoints:** See [API Documentation](./api.md)
- **Running Tests:** `npm test`
- **Development Server:** `npm run dev`

### For Users
- **Understanding Strictness Levels:** [Strictness Level Guide](./strictness-level.md)

## Project Structure

```
space-repetition-tutor/
├── app/                    # Next.js App Router (Frontend)
│   ├── api/               # API routes (Backend)
│   ├── dashboard/         # Dashboard pages
│   ├── free/              # Free practice mode
│   ├── interview/         # Interview mode
│   ├── login/             # Authentication pages
│   ├── settings/          # Settings pages
│   ├── signup/            # Registration page
│   └── study/             # Study page
├── components/            # React components (Frontend)
├── docs/                  # Documentation
├── deployment/            # Docker configuration
├── e2e/                   # End-to-end tests
├── lib/                   # Backend services (Business Logic)
│   ├── config/           # Configuration management
│   ├── contexts/         # React contexts
│   ├── prisma.ts         # Database client
│   └── services/         # Business logic services
│       ├── auth.service.ts
│       ├── career.service.ts
│       ├── encryption.service.ts
│       ├── leitner.service.ts
│       ├── llm/          # LLM integration
│       ├── llm-config.service.ts
│       ├── question.service.ts
│       ├── session.service.ts
│       └── stats.service.ts
├── prisma/               # Database schema and migrations
└── middleware.ts         # Next.js middleware
```

## Architecture Overview

### Frontend (app/, components/)
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS
- **State:** React Context + hooks

### Backend (app/api/, lib/services/)
- **API Routes:** Next.js API Routes
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma
- **LLM:** LiteLLM-compatible proxy

### Clean Architecture
The project follows clean architecture principles:

1. **Controllers** (`app/api/**/*.ts`) - Handle HTTP requests/responses
2. **Services** (`lib/services/**/*.ts`) - Business logic
3. **Repository** - Data access via Prisma

## Testing

- **Unit Tests:** `lib/**/__tests__/**/*.test.ts`
- **E2E Tests:** `e2e/**/*.spec.ts`
- **Run All:** `npm test`
