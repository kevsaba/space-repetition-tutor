# Space Repetition Tutor

An AI-powered study companion for technical interview preparation using spaced repetition and active recall.

---

## What This App Does

Space Repetition Tutor helps you prepare for technical interviews by:

- **Focusing on weak areas** - Uses the Leitner spaced repetition system to prioritize questions you struggle with
- **AI-generated feedback** - Get detailed, interview-ready feedback on your answers
- **Two study modes:**
  - **Free Practice** - Study any topic at your chosen difficulty
  - **Interview Mode** - Follow a structured path for your career track

---

## Quick Start

Run this app locally in 3 simple steps:

### 1. Clone and Install

```bash
git clone https://github.com/kevsaba/space-repetition-tutor.git
cd space-repetition-tutor
npm install
```

### 2. Start the App

```bash
npm run dev
```

The app will open at **http://localhost:3000**

### 3. Complete the Setup Wizard

When you first visit the app, you'll be guided through a one-time setup:

1. **Database** - Connect to a PostgreSQL database (Supabase recommended, or use your own)
2. **Create Account** - Sign up with a username and password
3. **Configure LLM** - Enter your OpenAI API key (or compatible service)

That's it! You're ready to study.

---

## Database Options

You need a PostgreSQL database. Here are popular free options:

| Option | Link | Best For |
|--------|------|----------|
| **Supabase** | [supabase.com](https://supabase.com) | Easiest setup, free tier |
| **Neon** | [neon.tech](https://neon.tech) | Serverless, free tier |
| **Railway** | [railway.app](https://railway.app) | Simple, free tier |

**What you'll need:** Two connection strings from your database provider (one with pooling, one direct). The setup wizard will guide you.

---

## LLM Options

The app uses an LLM to generate questions and evaluate your answers. You can use:

| Option | Link | Notes |
|--------|------|-------|
| **OpenAI** | [platform.openai.com](https://platform.openai.com) | `gpt-4o-mini` recommended |
| **Groq** | [groq.com](https://groq.com) | Fast, has free tier |
| **Together AI** | [together.ai](https://together.ai) | Open-source models |

**What you'll need:** An API key from your provider. The setup wizard will ask for:
- API URL (e.g., `https://api.openai.com/v1`)
- API Key
- Model name (e.g., `gpt-4o-mini`)

---

## How the Leitner System Works

Questions are organized into 3 boxes based on your performance:

| Box | Review Interval | Meaning |
|-----|-----------------|---------|
| 🟥 Box 1 | Daily | Still learning |
| 🟨 Box 2 | Every 3 days | Getting comfortable |
| 🟩 Box 3 | Weekly | Mastered |

- **Correct answer** → Move up one box
- **Wrong answer** → Back to Box 1

The app always shows you questions that are due for review, prioritizing Box 1.

---

## Development Commands

```bash
# Start development server
npm run dev

# View database in browser
npx prisma studio

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

---

## Project Structure

```
space-repetition-tutor/
├── app/                    # Next.js pages (App Router)
│   ├── api/               # API endpoints
│   ├── dashboard/         # Progress dashboard
│   ├── free/              # Free practice mode
│   └── interview/         # Interview mode
├── components/            # Reusable React components
├── lib/                   # Core logic (services, contexts)
├── prisma/               # Database schema
└── prompts/              # LLM prompt templates
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - feel free to fork and modify.

---

**Built with:** Next.js 14, TypeScript, Prisma, Tailwind CSS
