# Contributing to Space Repetition Tutor

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- PostgreSQL 14+ (or use Docker)
- An account with an LLM provider (OpenAI, or compatible)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/space-repetition-tutor.git
   cd space-repetition-tutor
   ```

3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/kevsaba/space-repetition-tutor.git
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `DATABASE_URL` - Your PostgreSQL connection string
- `DIRECT_URL` - Direct connection for migrations
- `LLM_API_URL` - Your LLM API endpoint
- `LLM_API_KEY` - Your LLM API key
- `LLM_MODEL` - Model to use (e.g., `gpt-4o-mini`)
- `JWT_SECRET` - A secure random string

### 3. Set Up the Database

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Avoid `any` types - use proper type definitions
- Run `npx tsc --noEmit` before committing

### Code Style

- Use Prettier for formatting (included in the project)
- Use ESLint for linting: `npm run lint`
- Follow the existing code style in the project

### File Naming

- Components: PascalCase (e.g., `QuestionDisplay.tsx`)
- Utilities/Services: camelCase (e.g., `questionService.ts`)
- Pages: lowercase (e.g., `study/page.tsx`)

### Component Structure

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props

### Error Handling

- Use domain errors for business logic: `class DomainError extends Error`
- Handle errors gracefully with user-friendly messages
- Log errors for debugging

### Testing

- Write tests for new features
- Run tests before committing: `npm test`
- Aim for good test coverage on business logic

---

## Commit Messages

Use clear, descriptive commit messages:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Examples

```
feat(auth): add password reset functionality

Fix issue where users couldn't reset passwords.

Closes #123

fix(question): prevent duplicate question generation

LLM was generating duplicate questions for the same topic.
Added deduplication logic in QuestionService.
```

---

## Pull Request Process

### 1. Create a Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow the coding standards above
- Write/update tests as needed
- Update documentation if applicable

### 3. Commit Your Changes

```bash
git add .
git commit -m "feat: describe your feature"
```

### 4. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 5. Create a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Provide a clear description of your changes
4. Link any related issues

### PR Guidelines

- Keep PRs focused and reasonably sized
- One feature per PR if possible
- Include tests for new functionality
- Update documentation for user-facing changes
- Ensure all CI checks pass

---

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Description** - Clear description of the bug
- **Steps to Reproduce** - Steps to reproduce the issue
- **Expected Behavior** - What you expected to happen
- **Actual Behavior** - What actually happened
- **Environment** - OS, browser, Node.js version
- **Logs** - Relevant error messages or logs

### Feature Requests

For feature requests, please include:

- **Problem Statement** - What problem does this solve?
- **Proposed Solution** - How do you envision the solution?
- **Alternatives Considered** - What alternatives did you consider?
- **Use Case** - How would this benefit users?

---

## Development Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma migrate dev   # Create and apply migration
npx prisma migrate reset # Reset database (dev only)
npx prisma studio        # View database in browser
npx prisma db seed       # Seed template data
npx prisma db pull       # Pull schema from database

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run lint             # Run ESLint
npx tsc --noEmit         # Type check
```

---

## Questions?

Feel free to open an issue for discussion or clarification. We're happy to help!

---

**Code of Conduct**

Be respectful, constructive, and collaborative. We're all here to build something great together.
