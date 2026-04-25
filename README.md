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

```
┌─────────────────────────────────────────────────────────────────┐
│                         RECRUITER BROWSER                        │
│  Next.js App Router · Redux Toolkit · Tailwind CSS               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Job Forms │  │ Candidate│  │ Screening│  │ Results +      │  │
│  │ + Enhance │  │ Upload   │  │ Wizard   │  │ Analytics      │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST + SSE
┌──────────────────────────────▼──────────────────────────────────┐
│                    NODE.JS / EXPRESS API                          │
│  Auth · Jobs · Candidates · Screening · Analytics · Email        │
│  ┌──────────────────────┐   ┌───────────────────────────────┐   │
│  │ Preprocessing Service │   │ Background Job Service (SSE)  │   │
│  │ (numeric signals,     │   │ runs screening off-request,   │   │
│  │  risk flags, skill    │   │ streams progress events to    │   │
│  │  match ratios)        │   │ frontend via EventSource      │   │
│  └──────────┬───────────┘   └───────────────────────────────┘   │
│             │                                                     │
│  ┌──────────▼──────────────────────────────────────────────┐    │
│  │                  GEMINI SERVICE                           │    │
│  │  Prompt 1: Job Enhancement / Requirement Extraction       │    │
│  │  Prompt 2: Multi-Candidate Batch Evaluation (20/batch)    │    │
│  │  Prompt 3: Rejection Reasons + Improvement Suggestions    │    │
│  │  Prompt 4: Resume Parsing (PDF → structured profile)      │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Mongoose ODM
┌──────────────────────────────▼──────────────────────────────────┐
│                         MONGODB ATLAS                             │
│        Jobs · Candidates · ScreeningResults · Users              │
└─────────────────────────────────────────────────────────────────┘
```

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
│   │   │   ├── geminiService.ts       # All Gemini prompts + pipeline
│   │   │   ├── preprocessingService.ts # Numeric pre-analysis before AI
│   │   │   └── backgroundJobService.ts # Async screening + SSE events
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
    └── candidates.json   # Dummy profiles following Umurava talent schema
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `PORT` | optional | API port, defaults to 5000 |
| `FRONTEND_URL` | optional | CORS origin for production |
| `SCREENING_MODEL` | optional | Gemini model for screening (default: `gemini-2.0-flash`) |
| `RESUME_PARSER_MODEL` | optional | Gemini model for PDF parsing (default: `gemini-2.0-flash-lite`) |
| `SCREENING_THINKING_BUDGET` | optional | Reasoning token budget per call (default: 2048) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL |

## Run Locally

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev
```

Default API base: `http://localhost:5000/api`

### 2) Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev
```

App URL: `http://localhost:3000`

## AI Decision Flow

The screening pipeline runs in five sequential steps:

### Step 1 — Job Enhancement (optional, on-demand)
- **Trigger:** recruiter clicks "AI Enhance Job" on the job form
- **Prompt:** raw job description + title → Gemini extracts structured requirements, infers responsibilities, suggests scoring weights
- **Output:** enhanced description, required skills list, nice-to-have list, weight suggestions

### Step 2 — Preprocessing (deterministic, no AI)
- **Service:** `preprocessingService.ts`
- **What it does:** for each candidate, compute numeric signals before sending to Gemini
  - skill match ratio (matched / required skills)
  - total experience in months
  - raw education score
  - risk flags: employment gaps > 6 months, short tenures < 12 months, unverified skills
  - availability score
- **Why:** reduces hallucination by giving Gemini pre-computed facts instead of asking it to do arithmetic

### Step 3 — Multi-Candidate Batch Evaluation
- **Prompt 2** in `geminiService.ts` (`buildEvaluationPrompt`)
- Candidates are processed in batches of 20
- Each candidate receives a score breakdown across 5 weighted dimensions:
  - `skillsScore`, `experienceScore`, `educationScore`, `projectsScore`, `availabilityScore`
- Final score = weighted composite using the job's custom weights (must sum to 100)
- Also generates: confidence score, strengths, gaps, risks, recommendation, reasoning, 3 interview questions, bias flags
- If candidates span multiple batches, the top candidates are re-evaluated in a final cross-batch ranking pass

### Step 4 — Shortlist + Rejection Reasons
- **Prompt 3** in `geminiService.ts` (`buildRankingPrompt`)
- Top N candidates (configurable: 10 or 20) form the shortlist
- Every rejected candidate receives: `whyNotSelected`, top missing skills, how close they were to the cutoff, and 2–3 actionable improvement suggestions

### Step 5 — Aggregate Insights
- Computed server-side (no AI): skill demand ranking, common gaps, score distribution, avg scores per category, recommendation breakdown

All steps run asynchronously. Progress is streamed to the frontend via Server-Sent Events (SSE) — the UI shows live batch progress, partial leaderboard, and Gemini's reasoning tokens as they arrive.

## Assumptions and Limitations

### Assumptions
- Candidate profiles follow the Umurava talent schema (see `sample-data/candidates.json`); CSV imports are mapped to this schema server-side
- Recruiter has read and understood the AI output before making any hiring decision — the system is designed to inform, not decide
- Gemini API key has sufficient quota for the number of candidates being screened (see batch sizing note below)
- Job scoring weights are set intentionally by the recruiter; the system enforces they sum to 100 before screening can start

### Known Limitations
- **Gemini quota:** free-tier keys hit RPM limits quickly. With 50+ candidates across 3 prompts, screening may take 2–4 minutes due to rate-limit queuing. A paid key removes this constraint.
- **PDF parsing accuracy:** Gemini extracts structured data from PDF text; scanned/image-only PDFs will produce empty or partial profiles since no OCR is applied before parsing.
- **Batch re-ranking:** cross-batch consistency is achieved by a final re-ranking pass over the top 2× shortlist candidates, but scores from different batches may have small calibration differences.
- **Bias detection is advisory:** the system flags potential bias language in its own outputs, but cannot guarantee objective outcomes — human review of shortlists remains mandatory.
- **No real-time collaboration:** screening results are per-user; concurrent recruiters working the same job do not see each other's in-progress screening.
- **Email delivery:** the email feature uses a configured SMTP provider; no fallback is provided if the provider is unreachable.

## Operational Notes

- Screening runs in the background and streams progress events via SSE.
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
