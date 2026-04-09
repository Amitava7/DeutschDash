# DeutschDash

A German language learning web application with spaced repetition flashcards, tense practice, and reading comprehension exercises.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Prisma 5** + MongoDB (Atlas in production, Docker locally)
- **NextAuth.js v4** — session-based authentication
- **Shadcn/ui** — component library

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Docker (for local MongoDB)

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `MONGODB_URI` — use `mongodb://localhost:27017/deutschdash` for local dev
- `NEXTAUTH_SECRET` — any random string (e.g. `openssl rand -base64 32`)

### 3. Start MongoDB

```bash
docker-compose up -d
```

### 4. Install & generate Prisma client

```bash
npm install
npx prisma generate
```

### 5. (Optional) Seed with a demo user

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' src/lib/seed.ts
```

### 6. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Features

### Flashcards (SRS)
- Flip-card UI with 3D CSS animation
- SM-2 spaced repetition: Hard resets to end of session; Easy advances through levels (1 day → 7 → 14 → 28 → 56…)
- Dashboard shows a green border/check when a deck has no cards due today

### Tense Practice
- Select a German tense (Präsens, Perfekt, Konjunktiv II, etc.)
- Claude generates 10 fill-in-the-blank sentences at your current level
- "Check Answers" highlights correct (green) and incorrect (red) with the correct answer shown

### Reading Comprehension
- Enter any topic or pick from suggestions
- Claude generates a level-appropriate German passage
- 3 multiple-choice questions with "Reveal Answer" toggle per question

### Level Selector
- Dropdown in the nav bar (A1 → C2)
- Persisted to the database and passed to all Claude API calls

## Production

Set `MONGODB_URI` to your MongoDB Atlas connection string and `NEXTAUTH_URL` to your domain.
