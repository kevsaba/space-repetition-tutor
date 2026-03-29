# Space Repetition Tutor

An AI-driven study companion that helps users prepare for technical interviews using spaced repetition and active recall.

**[Self-hosted](#self-hosting) • [Open Source](#contributing) • [AI-Powered](#how-it-works)**

---

## Overview

This application uses the **Leitner System** (a proven spaced repetition algorithm) combined with **AI-generated feedback** to help you:

- Focus study time on weak areas
- Strengthen memory through active recall
- Get interview-ready feedback on your answers
- Prepare for technical interviews effectively

---

## Features

- 📚 **Leitner Spaced Repetition** - 3-box system for optimal learning intervals
- 🤖 **AI-Powered Feedback** - Detailed evaluation of your answers
- 🎯 **Interview Mode** - Structured preparation following career track topics
- 📊 **Progress Dashboard** - Track your learning progress
- 📤 **CSV/Excel Upload** - Bring your own questions
- 🔧 **Fully Self-Hostable** - Use your own LLM and database

---

## Quick Start

### Option 1: Docker (Recommended)

The easiest way to run the app locally:

```bash
# Clone the repository
git clone https://github.com/kevsaba/space-repetition-tutor.git
cd space-repetition-tutor

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Set your LLM_API_KEY and DATABASE_URL

# Start with Docker
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate dev
docker-compose exec app npx prisma db seed

# Open http://localhost:3000
```

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/kevsaba/space-repetition-tutor.git
cd space-repetition-tutor

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

#### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spaced_repetition_tutor?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/spaced_repetition_tutor"

# LLM Configuration
LLM_API_URL=https://api.openai.com/v1
LLM_API_KEY=sk-your-api-key-here
LLM_MODEL=gpt-4o-mini

# Auth
JWT_SECRET=generate-a-secure-random-string
```

#### Run the app

```bash
# Set up the database
npx prisma migrate dev
npx prisma db seed

# Start development server
npm run dev

# Open http://localhost:3000
```

---

## Self-Hosting

This application is designed to be **fully self-hostable**. You provide:

### 1. Database

You can use any PostgreSQL-compatible database:

| Option | Cost | Difficulty | Best For |
|--------|------|------------|----------|
| **Supabase** | Free tier available | Easy | Quick setup, managed |
| **Local Postgres** | Free | Medium | Complete control |
| **Railway/Render** | Free-$5/mo | Easy | Cloud deployment |

#### Using Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → Database to get your connection strings
4. Copy the **Connection String** (with pooling) as `DATABASE_URL`
5. Copy the **Connection String** (without pooling) as `DIRECT_URL`

#### Using Docker PostgreSQL

The included `docker-compose.yml` has a PostgreSQL service:

```bash
docker-compose up -d postgres
```

### 2. LLM Provider

The app uses **OpenAI-compatible APIs**. You can use:

| Provider | Base URL | Notes |
|----------|----------|-------|
| **OpenAI** | `https://api.openai.com/v1` | Get API key from [platform.openai.com](https://platform.openai.com/api-keys) |
| **LiteLLM** | Your proxy URL | Host your own proxy, switch between providers |
| **Azure OpenAI** | Your Azure endpoint | Use your Azure OpenAI resource |
| **Groq** | `https://api.groq.com/openai/v1` | Fast & free options |
| **Together AI** | `https://api.together.xyz/v1` | Open source models |

#### Setting up OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Create an API key
4. Set in your `.env`:
   ```env
   LLM_API_URL=https://api.openai.com/v1
   LLM_API_KEY=sk-your-key-here
   LLM_MODEL=gpt-4o-mini
   ```

---

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
npx tsc --noEmit         # Type check

# Building
npm run build            # Production build
```

### Project Structure

```
space-repetition-tutor/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── study/             # Study session page
│   └── upload/            # CSV/Excel upload page
├── components/            # React components
├── lib/                   # Core business logic
│   ├── config/            # Environment configuration
│   ├── contexts/          # React contexts
│   ├── middleware/        # API middleware
│   ├── prisma/            # Prisma client
│   └── services/          # Business services
├── prisma/               # Database schema and migrations
├── prompts/              # LLM prompt templates
├── CLAUDE.md             # Project instructions for AI agents
├── ROADMAP.md            # Implementation roadmap
└── README.md             # This file
```

---

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
2. **Choose mode:**
   - **FREE MODE** - Study any topic, Leitner system prioritizes weak areas
   - **INTERVIEW MODE** - Follow structured career track order
3. **Answer questions** - type your response
4. **Get AI feedback** - detailed evaluation with:
   - What you got right
   - How to phrase at senior level
   - Corrections for misconceptions
   - Interview-ready answer
   - Memorable analogies
5. **Follow-up questions** - Dive deeper into the topic
6. **Progress tracked** - box levels update automatically

---

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Set environment variables in Vercel dashboard
# Then deploy
vercel --prod
```

### Environment Variables for Production

Set these in your hosting platform:

```env
DATABASE_URL="your-production-db-url"
DIRECT_URL="your-production-db-direct-url"
LLM_API_URL="https://api.openai.com/v1"
LLM_API_KEY="your-production-api-key"
LLM_MODEL="gpt-4o-mini"
JWT_SECRET="your-production-jwt-secret"
NODE_ENV="production"
```

---

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project instructions for AI agents
- **[ROADMAP.md](ROADMAP.md)** - Phase-by-phase implementation plan
- **[API.md](API.md)** - Complete API specification

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License - feel free to fork and modify for your own use.

---

**Status:** Production Ready ✅

*Built with Next.js 14, TypeScript, Prisma, and Tailwind CSS*
# Test Sun Mar 29 20:15:01 CEST 2026
