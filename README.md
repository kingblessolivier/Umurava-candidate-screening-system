# TalentAI

Enterprise-oriented AI recruiting platform for role creation, candidate management, screening orchestration, and hiring analytics.

## What This System Does

TalentAI helps HR teams and hiring managers:
- create and refine job definitions,
- ingest candidate profiles (manual, CSV, JSON, PDF parsing),
- run background AI screening workflows,
- track live screening progress,
- review ranked outcomes with explanations and analytics.

## Core Capabilities

- **Job management** with weighted evaluation criteria
- **Candidate pipeline** with list + stage visualization
- **AI screening orchestration** with background processing
- **Live screening telemetry** (thought stream, progress, partial results)
- **Result explainability** (scores, reasoning, rejected-candidate feedback)
- **Dashboard analytics** (hiring health and quality distribution)
- **Draft recovery + autosave** for long form workflows

## High-Level Architecture

### Frontend
- Next.js App Router + TypeScript
- Redux Toolkit for global state (auth, jobs, candidates, screening, analytics)
- Tailwind UI patterns for operational dashboards and workflows

### Backend
- Node.js + Express + TypeScript
- REST API for auth, jobs, candidates, screening, analytics, notifications
- Background job flow for long-running screening tasks

### Data + AI
- MongoDB for domain persistence
- Gemini-based evaluation pipeline for screening and enrichment tasks

## Repository Structure

```text
TalentAi/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.ts
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── contexts/
│   │   └── lib/
│   └── .env.local.example
└── sample-data/
```

## Run Locally

## 1) Backend

```bash
cd backend
npm install
cp .env.example .env
```

Set required environment variables in `backend/.env`:
- `MONGODB_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`

Start backend:

```bash
npm run dev
```

Default API base: `http://localhost:5000/api`

## 2) Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Set:
- `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

Start frontend:

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Operational Notes

- Screening is designed to run in the background and stream progress events.
- Draft autosave is enabled on long forms (jobs/candidates) to prevent data loss.
- Resume/recovery behavior is implemented for interrupted workflows.

## Quality and Review Readiness

The codebase is prepared for technical review with emphasis on:
- typed interfaces across client/server boundaries,
- deterministic UI behavior (hydration-safe rendering in dynamic views),
- reducer-driven state transitions for screening lifecycle,
- reusable form utilities (autosave, recovery, validation),
- consistent loading states (skeleton-first UX).

## License

MIT

