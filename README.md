# VoicePreserve

VoicePreserve is a production-oriented web app for revising rough or AI-assisted drafts so they sound more like the author while preserving meaning and transparency.

## Product boundaries

VoicePreserve is **not** a detector-evasion tool.

It does not provide, market, or optimize for:
- bypassing AI detectors
- detector score gaming
- passing GPTZero, ZeroGPT, Turnitin, or similar systems
- concealment-focused authorship workflows

It is built for:
- preserving meaning
- personalized voice alignment
- transparent editing records
- responsible AI use

## Tech stack

- Frontend + API: Next.js 16, TypeScript
- Database: PostgreSQL + Prisma ORM
- Queue/background jobs: Redis + BullMQ worker
- Storage: pluggable adapter (`local` included)
- Auth: email/password with secure session cookie, OAuth-ready schema evolution path
- Testing: Vitest (unit/integration), Playwright (e2e)
- Local dev infra: Docker Compose

## Architecture

### Core services

- `src/lib/services/rewrite.ts`: revision orchestration and candidate persistence
- `src/lib/ai/provider.ts`: provider contract
- `src/lib/ai/mock-provider.ts`: local mock provider (no external credentials required)
- `src/lib/services/semantic.ts`: sentence-level semantic fidelity and drift warnings
- `src/lib/services/voice-profile.ts`: style profile extraction from writing samples
- `src/lib/services/transparency.ts`: transparency report generation
- `src/lib/services/export.ts`: export artifacts and queue integration

### Data model

Defined in `prisma/schema.prisma` with migrations in `prisma/migrations/`.

Primary entities:
- users
- projects
- source_documents
- writing_samples
- voice_profiles
- revisions
- sentence_diffs
- transparency_reports
- export_jobs
- audit_events

## Privacy and security defaults

- minimal metadata logging by default
- raw draft logging disabled by default (`ENABLE_RAW_CONTENT_LOGGING=false`)
- CSRF token checks for authenticated mutating API calls
- secure HTTP-only session cookie
- upload validation for allowed file types
- per-IP API rate limiting middleware
- account privacy deletion endpoint to remove drafts/files/history (`/api/privacy/delete`)

## Core user flow implemented

1. Sign up/login (`/auth`)
2. Create project (`/dashboard`)
3. Add source text by paste or upload `.txt/.docx/.pdf`
4. Optionally upload writing samples and build voice profile (`/voice-profile`)
5. Generate 1-3 rewrite options in project editor (`/projects/[id]`)
6. Review sentence-level diff and rationale
7. See semantic drift warnings (low similarity, named entities, claim strength, numbers/dates, citations)
8. Accept/reject sentence changes
9. Generate transparency report (`/transparency-report`)
10. Queue exports (final text, tracked diff, summary, transparency PDF)

## Local setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

### 3) Start infrastructure

```bash
docker compose up -d db redis
```

### 4) Run migrations and seed data

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5) Run app + worker

Terminal A:
```bash
npm run dev
```

Terminal B:
```bash
npm run worker
```

### 6) Demo account

From `.env` defaults:
- email: `demo@voicepreserve.app`
- password: `DemoPass123!`

## Tests

```bash
npm run test
npm run test:e2e
```

## Health check

- `GET /api/health`

## Deployment notes

1. Use managed Postgres + Redis in production.
2. Replace local storage adapter with S3-compatible adapter.
3. Set strong secrets (`JWT_SECRET`, `CSRF_SECRET`).
4. Run `npm run prisma:deploy` in CI/CD release phase.
5. Run worker as a separate process/service.

## Responsible copy guidance

Use copy emphasizing:
- preserve your meaning
- sound more like yourself
- track your editing process
- support responsible AI use

Do not use:
- undetectable
- bypass detectors
- beat GPTZero
- pass Turnitin
- evade AI detection
