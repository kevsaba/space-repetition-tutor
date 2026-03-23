# Space Repetition Tutor

An AI-driven study companion that helps users prepare for technical interviews using spaced repetition and active recall.

## Overview

This application uses the **Leitner System** (a proven spaced repetition algorithm) combined with **AI-generated feedback** to help you:

- Focus study time on weak areas
- Strengthen memory through active recall
- Get interview-ready feedback on your answers
- Prepare for technical interviews effectively

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API Routes (TypeScript)
- **Database:** Supabase (PostgreSQL) + Prisma ORM
- **LLM:** GPT-4o-mini via LiteLLM-compatible proxy

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- PostgreSQL database (or use Supabase)

### Installation

1. Clone the repository:
```bash
git clone git@github.com:kevsaba/space-repetition-tutor.git
cd space-repetition-tutor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spaced_repetition_tutor?schema=public"
LLM_URL=https://aikeys.maibornwolff.de/v1
LLM_API_KEY=your-api-key-here
LLM_MODEL=gpt-4o-mini
```

4. Set up the database:
```bash
npx prisma migrate dev
npx prisma db seed
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Development

### Commands

```bash
# Development
npm run dev              # Start Next.js dev server

# Database
npx prisma migrate dev   # Create and apply migration
npx prisma migrate reset # Reset database (dev only!)
npx prisma studio        # View database in browser
npx prisma db seed       # Seed database with template data

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode

# Linting/Type Checking
npm run lint             # ESLint
npx tsc --noEmit         # Type check without emitting

# Building
npm run build            # Production build
```

## Project Structure

```
space-repetition-tutor/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── study/             # Study session page
├── components/            # React components
├── lib/                   # Core business logic
│   ├── services/         # Business services (Leitner, Auth, etc.)
│   └── contexts/         # React contexts
├── prisma/               # Database schema and migrations
├── prompts/              # LLM prompt templates
├── docs/                 # Additional documentation
├── CLAUDE.md             # Project instructions for AI agents
├── API.md                # API specification
├── ROADMAP.md            # Implementation roadmap
└── PHASE_1_TASKS.md      # Phase 1 task breakdown
```

## How It Works

### Leitner System

The app uses a 3-box Leitner system:

| Box | Review Interval | Description |
|-----|-----------------|-------------|
| 1 | 1 day | Struggling concepts |
| 2 | 3 days | Some mastery |
| 3 | 7 days | Well-learned |

**Rules:**
- Correct answer → Promote to next box (max 3)
- Incorrect answer → Reset to Box 1

### Study Flow

1. **Login** to your account
2. **Fetch due questions** - prioritizes Box 1 → Box 2 → Box 3
3. **Answer questions** - type your response
4. **Get AI feedback** - detailed evaluation with:
   - What you got right
   - How to phrase at senior level
   - Corrections for misconceptions
   - Interview-ready answer
   - Memorable analogies
   - Production insights
5. **Box updates** - your progress is tracked automatically

## Documentation

- **CLAUDE.md** - Project instructions for AI agents
- **API.md** - Complete API specification
- **ROADMAP.md** - Phase-by-phase implementation plan
- **PHASE_1_TASKS.md** - Detailed Phase 1 task breakdown

## Contributing

This project follows a multi-agent workflow with milestone-based execution. See `CLAUDE.md` for details.

## License

MIT

---

**Status:** Early Development - Phase 1 (Foundation) in progress
