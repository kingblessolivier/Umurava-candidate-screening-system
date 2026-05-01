# TalentAI — Complete System Explanation

> How the system works from the first user action to the final AI-ranked result.

---

## Table of Contents

1. [What TalentAI Does](#1-what-talentai-does)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Database — MongoDB Collections](#4-database--mongodb-collections)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [Authentication Flow](#6-authentication-flow)
7. [Job Management Flow](#7-job-management-flow)
8. [Candidate Ingestion — Three Pathways](#8-candidate-ingestion--three-pathways)
9. [The AI Screening Pipeline — Step by Step](#9-the-ai-screening-pipeline--step-by-step)
10. [Gemini Models Used](#10-gemini-models-used)
11. [Bias Detection & Risk Detection](#11-bias-detection--risk-detection)
12. [Real-Time Notifications (SSE)](#12-real-time-notifications-sse)
13. [Analytics & Dashboard](#13-analytics--dashboard)
14. [Email System](#14-email-system)
15. [Environment Variables](#15-environment-variables)
16. [End-to-End Flow Summary](#16-end-to-end-flow-summary)

---

## 1. What TalentAI Does

TalentAI is an AI-powered talent screening system. A recruiter posts a job, uploads candidate resumes (PDF, CSV, or JSON), then runs a screening. The system:

- Parses every resume into structured data using Gemini
- Pre-scores candidates locally (no AI needed yet)
- Sends candidates to Gemini in batches for deep evaluation
- Re-ranks borderline candidates to ensure fairness across batches
- Returns a ranked shortlist with scores, strengths, gaps, interview questions, and bias flags
- Provides every rejected candidate a "Why Not Selected" explanation with improvement suggestions

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Redux Toolkit |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (via Mongoose) |
| AI Model | Google Gemini API (gemini-2.0-flash) |
| Auth | JWT (Bearer token, 7-day expiry) |
| Real-time | Server-Sent Events (SSE) |
| Email | Nodemailer (SMTP) |
| Security | Helmet, CORS, express-rate-limit, Zod validation |

---

## 3. System Architecture Overview

```
Client (Next.js)
      │
      ▼
Express Server (port 5000)
  ├── Helmet (security headers)
  ├── CORS (whitelist: localhost:3000, FRONTEND_URL)
  ├── Rate Limiter: 200 req/15min global | 10 req/60s for AI endpoints
  ├── JWT Auth Middleware
  └── Routes
        ├── /api/auth        → AuthController
        ├── /api/jobs        → JobController
        ├── /api/candidates  → CandidateController
        ├── /api/screening   → ScreeningController
        ├── /api/analytics   → AnalyticsController
        ├── /api/email       → EmailController
        └── /api/notifications → NotificationController (SSE)
              │
              ▼
        Services Layer
        ├── geminiService        → Google Gemini API
        ├── preprocessingService → Local math-based scoring
        ├── backgroundJobService → Async job queue + SSE events
        ├── rateLimitService     → API quota management + caching
        └── emailService         → Nodemailer SMTP
              │
              ▼
        MongoDB
        ├── users
        ├── jobs
        ├── candidates
        └── screeningresults
```

---

## 4. Database — MongoDB Collections

### 4.1 Users Collection

Stores recruiter accounts.

| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| email | String | unique, lowercase |
| password | String | bcrypt hashed, min 8 chars |
| role | String | "recruiter" or "admin" |

---

### 4.2 Jobs Collection

Each job posting with AI-structured requirements and custom scoring weights.

| Field | Type | Notes |
|-------|------|-------|
| title | String | required |
| description | String | required |
| department | String | optional |
| location | String | required |
| type | String | Full-time / Part-time / Contract / Freelance |
| experienceLevel | String | Junior / Mid-level / Senior / Lead / Executive |
| requirements | Array | [{skill, level, yearsRequired, required}] |
| niceToHave | Array | List of bonus skills |
| responsibilities | Array | List of job duties |
| salaryRange | Object | {min, max, currency} |
| weights | Object | {skills, experience, education, projects, availability} — must sum to 100 |
| isActive | Boolean | default true |

**Indexes:** Full-text search on `title` + `description`; compound `isActive + createdAt`

---

### 4.3 Candidates Collection

One document per candidate, linked to a job via `jobId`.

| Field | Type | Notes |
|-------|------|-------|
| firstName, lastName | String | required |
| email | String | unique, lowercase |
| phone, headline, bio, location | String | optional |
| jobId | ObjectId | links candidate to a job |
| skills | Array | [{name, level (Beginner/Intermediate/Advanced/Expert), yearsOfExperience}] |
| experience | Array | [{company, role, startDate (YYYY-MM), endDate, isCurrent, description, technologies, achievements}] |
| education | Array | [{institution, degree, fieldOfStudy, startYear, endYear, gpa}] |
| certifications | Array | [{name, issuer, issueDate, expiryDate, credentialUrl}] |
| projects | Array | [{name, description, technologies, role, link, startDate, endDate, impact}] |
| availability | Object | {status, type, noticePeriod, preferredStartDate} |
| socialLinks | Object | {linkedin, github, portfolio, twitter} |
| source | String | "platform" / "csv" / "pdf" / "json" |
| parsedResumeText | String | Raw resume text, max 6000 chars |

**Indexes:** `skills.name` for filtering; `createdAt` for sorting

---

### 4.4 ScreeningResults Collection

One document per screening run. Contains every candidate's score, the shortlist, rejections, and pool-level insights.

**Shortlist entry fields:**

| Field | Notes |
|-------|-------|
| candidateId, candidateName, email | Identity |
| rank, finalScore (0-100) | Final position and score |
| breakdown | {skillsScore, experienceScore, educationScore, projectsScore, availabilityScore} |
| confidenceScore (0-100) | How confident the AI is in this assessment |
| strengths, gaps, risks | String arrays |
| recommendation | "Strongly Recommended" / "Recommended" / "Consider" / "Not Recommended" |
| summary, reasoning | AI explanation text |
| interviewQuestions | Suggested questions for this candidate |
| skillGapAnalysis | {matched, missing, bonus} skill arrays |
| biasFlags | [{type, signal, recommendation}] |
| riskFlags | [{type, detail, severity}] |

**Rejected candidate — additional fields:**

| Field | Notes |
|-------|-------|
| scoreGap | Points below the shortlist cutoff |
| whyNotSelected | AI-generated explanation |
| topMissingSkills | Key skills they lacked |
| closestShortlistScore | Score of the nearest shortlisted candidate |
| improvementSuggestions | Actionable feedback for the candidate |

**aggregateInsights:**

| Field | Notes |
|-------|-------|
| skillDemand | [{skill, count, avgScore}] — which skills the top candidates have |
| commonGaps | [{skill, missingCount}] — most frequently missing skills |
| scoreDistribution | [{range, count}] — histogram of scores |
| avgScoreByCategory | Average scores per dimension |
| topCandidateScore | Highest score in this pool |
| avgCandidateScore | Pool average |
| recommendationBreakdown | Count per recommendation level |

**Other metadata:** `aiModel`, `processingTimeMs`, `thinkingLog` (optional reasoning trace per batch)

---

## 5. API Endpoints Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create recruiter account |
| POST | /api/auth/login | No | Login, receive JWT |
| GET | /api/auth/me | Yes | Get own profile |
| PUT | /api/auth/me | Yes | Update name/email |
| PUT | /api/auth/change-password | Yes | Change password |

### Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/jobs | Yes | List jobs (supports ?search= ?active=) |
| POST | /api/jobs | Yes | Create job |
| GET | /api/jobs/:id | Yes | Get job details |
| PUT | /api/jobs/:id | Yes | Update job |
| DELETE | /api/jobs/:id | Yes | Delete job |
| POST | /api/jobs/enhance | Yes | **AI:** structure a rough description into requirements + weights |

### Candidates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/candidates | Yes | List (paginated, ?jobId= ?search=) |
| GET | /api/candidates/stats | Yes | Stats: total, by source, top skills |
| POST | /api/candidates | Yes | Create single candidate |
| POST | /api/candidates/bulk | Yes | **Background:** import JSON array (max 200) |
| POST | /api/candidates/upload/csv | Yes | **Background:** upload CSV/Excel |
| POST | /api/candidates/upload/pdf | Yes | **Background + AI:** upload 1-20 PDFs, parse each resume |
| GET | /api/candidates/:id | Yes | Get candidate |
| PUT | /api/candidates/:id | Yes | Update candidate |
| DELETE | /api/candidates/:id | Yes | Delete candidate |
| GET | /api/candidates/:id/score-history | Yes | All past screening scores for this candidate |
| POST | /api/candidates/:id/match-job | Yes | **AI:** score single candidate against a job |

### Screening

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/screening/run | Yes | **Background + AI:** run full pipeline for a job |
| GET | /api/screening | Yes | List all results (?jobId= filter) |
| GET | /api/screening/:id | Yes | Get full result |
| GET | /api/screening/job/:jobId/latest | Yes | Most recent screening for a job |
| DELETE | /api/screening/:id | Yes | Delete result |
| GET | /api/screening/:resultId/why/:email | Yes | Get rejection explanation for one candidate |
| POST | /api/background-jobs/:jobId/cancel | Yes | Cancel running screening |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics/dashboard | Dashboard stats |
| GET | /api/analytics/job/:jobId | Per-job trend data |
| POST | /api/email/send | Send emails to candidates |
| GET | /api/notifications/stream?token=JWT | SSE stream for real-time progress |
| GET | /api/background-jobs/:jobId | Poll job status |
| GET | /health | Server health check |
| GET | /api/system/health | Gemini quota status |

---

## 6. Authentication Flow

```
1. POST /api/auth/register → {name, email, password}
      → Zod validates input
      → bcrypt hashes password (10 rounds)
      → Creates User document in MongoDB
      → Signs JWT (payload: {id, name, email}, expires: 7 days)
      → Returns {token, user}

2. Every protected request:
      → Authorization: Bearer <token> header
      → requireAuth middleware decodes JWT
      → Attaches {id, name, email} to req.user
      → Rejects with 401 if missing or invalid
```

---

## 7. Job Management Flow

### Creating a Job Manually

```
POST /api/jobs
Body: {title, description, location, type, experienceLevel, requirements, weights}
  → Zod validates all fields
  → Saves to MongoDB jobs collection
  → Returns created job document
```

### AI-Enhanced Job Creation (the "Enhance" feature)

```
POST /api/jobs/enhance
Body: {title, description}
  → Calls Gemini with SCREENING_MODEL
  → Prompt: "You are a senior technical recruiter..."
  → Gemini returns:
      - enhancedDescription (2-3 professional paragraphs)
      - structuredRequirements [{skill, level, yearsRequired, required}]
      - inferredResponsibilities [...]
      - niceToHave [...]
      - suggestedWeights {skills:35, experience:30, education:15, projects:15, availability:5}
      - suggestedSalaryRange {min, max, currency}
  → Frontend uses this to pre-fill the job creation form
```

---

## 8. Candidate Ingestion — Three Pathways

All three pathways store the candidate in MongoDB BEFORE any screening happens.

### Pathway A — PDF Resume Upload (AI-Powered)

```
POST /api/candidates/upload/pdf  (multipart, 1-20 files, max 20 MB each)
  │
  ├─ 1. Extract text from each PDF using pdfjs-dist (sequential, not parallel
  │      to avoid WASM memory exhaustion)
  │
  ├─ 2. Extract email from text via regex
  │
  ├─ 3. Return 202 immediately with backgroundJobId
  │
  └─ 4. setImmediate (async, non-blocking):
          For each PDF:
          ├─ Call Gemini: parseResumeToProfile(rawText, email)
          │    Model: RESUME_PARSER_MODEL (gemini-2.0-flash)
          │    Temperature: 0.1 (deterministic)
          │    Input: resume text trimmed to 12,000 chars
          │    Output: {firstName, lastName, skills, experience,
          │             education, certifications, projects,
          │             availability, socialLinks, headline, bio}
          │
          ├─ Upsert Candidate in MongoDB (source: "pdf")
          │
          └─ Send SSE progress notification to recruiter
```

### Pathway B — CSV / Excel Import

```
POST /api/candidates/upload/csv
  ├─ Parse CSV/XLSX rows
  ├─ Extract skills from semicolon-delimited text fields
  ├─ Map columns to Candidate schema
  ├─ Return 202 immediately
  └─ setImmediate: bulk create Candidates (source: "csv"), emit progress
```

### Pathway C — JSON Bulk Import

```
POST /api/candidates/bulk
  Body: array of pre-structured candidate profiles (max 200)
  ├─ Return 202 immediately
  └─ setImmediate: create all Candidates (source: "json"), emit progress
```

---

## 9. The AI Screening Pipeline — Step by Step

This is the core of TalentAI. Triggered by `POST /api/screening/run` with `{jobId, shortlistSize}`.

### Step 0 — Setup

```
1. Fetch Job from MongoDB
2. Fetch ALL Candidates where candidate.jobId === jobId from MongoDB
   → Data is already in DB from the ingestion step
3. Create BackgroundJob record (status: "running")
4. Return 202 to client immediately
5. setImmediate → begin pipeline
```

---

### Step 1 — Preprocessing (No AI, Pure Math)

**Service:** `preprocessingService.ts`

Before calling Gemini, we compute numeric signals locally. This reduces AI hallucination because Gemini receives pre-computed scores rather than having to infer everything from raw text.

**For each candidate, we compute:**

| Dimension | How it is calculated |
|-----------|---------------------|
| rawSkillScore | (matched required skills / total required) × 70, +5 per skill level match, +3 per years-of-experience match, +4 per relevant certification |
| rawExperienceScore | Map total years to 0-60 range + 5 per matching job role title + 3 per matching technology used |
| rawEducationScore | Degree tier map (PhD=100, Master=90, Bachelor=70, Associate=55, etc.) + field relevance + certifications |
| rawProjectScore | Base 30 + 4 per matching technology + 5 if project link exists + 3 if impact description exists |
| rawAvailabilityScore | Available=100, Open to Opportunities=70, Not Available=20 + 10 if job type matches |

**Risk Detection (also in preprocessing):**

| Risk Type | Condition | Severity |
|-----------|-----------|----------|
| SKILL_UNVERIFIED | Candidate claims Advanced/Expert skill but never used it in any job or project | medium |
| SHORT_TENURE | 2+ jobs with tenure < 12 months | medium (high if 3+) |
| EMPLOYMENT_GAP | Gap > 6 months between two jobs | medium (high if > 12 months) |
| MISSING_CRITICAL_SKILL | 3+ required skills are absent | high |
| OVERQUALIFIED | Years of experience significantly exceeds the role's expected max | low |

---

### Step 2 — Batch Evaluation (Gemini)

**Service:** `geminiService.ts` → `runScreeningPipeline()`

Candidates are divided into batches of 10 (configurable via `SCREENING_BATCH_SIZE`). Each batch is sent to Gemini in a single API call.

**What Gemini receives per batch:**

```
- Job title, description, requirements (with required levels and years)
- Job scoring weights (skills/experience/education/projects/availability)
- For each candidate:
    - Pre-computed raw scores (from preprocessing)
    - Full skill list with levels and years
    - Work experience entries (company, role, dates, technologies, achievements)
    - Education entries
    - Project entries
    - Availability status
    - Risk flags already detected
```

**What Gemini returns per candidate:**

```json
{
  "skillsScore": 82,
  "experienceScore": 75,
  "educationScore": 68,
  "projectsScore": 71,
  "availabilityScore": 100,
  "finalScore": 78.4,
  "confidenceScore": 85,
  "recommendation": "Recommended",
  "summary": "Strong backend engineer with...",
  "reasoning": "Candidate has 4 years of Node.js...",
  "strengths": ["Strong TypeScript skills", "Relevant fintech experience"],
  "gaps": ["No Kubernetes experience", "Limited system design exposure"],
  "risks": ["Short tenure at Company X"],
  "interviewQuestions": [
    "Walk me through a time you optimized a database query...",
    "How do you handle API rate limiting in production?"
  ],
  "skillGapAnalysis": {
    "matched": ["Node.js", "TypeScript", "MongoDB"],
    "missing": ["Kubernetes", "AWS"],
    "bonus": ["Redis", "Docker"]
  },
  "biasFlags": [
    {
      "type": "INSTITUTION_PRESTIGE_BIAS",
      "signal": "Candidate attended a lesser-known university",
      "recommendation": "Evaluate based on demonstrated skills, not institution name"
    }
  ]
}
```

**Final score formula:**

```
finalScore = (skillsScore × weights.skills
            + experienceScore × weights.experience
            + educationScore × weights.education
            + projectsScore × weights.projects
            + availabilityScore × weights.availability) / 100
```

---

### Step 3 — Re-ranking Borderline Candidates

If there were multiple batches, scores from different Gemini calls are not directly comparable (each batch has its own context). The system identifies candidates near the shortlist cutoff (top N ± 20%) and sends them together in a single re-ranking call so Gemini can compare them head-to-head.

```
Batch 1 top: Alice=82, Bob=79
Batch 2 top: Carol=81, Dave=78
Cutoff is top 3 candidates

→ Re-rank call: send Alice, Bob, Carol, Dave to Gemini together
→ Gemini adjusts scores with full cross-batch context
→ Final order: Alice=83, Carol=80, Bob=78, Dave=77
→ Shortlist: Alice, Carol, Bob
```

---

### Step 4 — Sort, Split, Generate Rejections

```
1. Sort all candidates by finalScore descending
2. Top N → shortlist
3. Rest → rejectedCandidates

4. For each rejected candidate near the cutoff (top 20):
      → Call Gemini with their profile + shortlist cutoff context
      → Gemini generates:
          - whyNotSelected: honest explanation
          - topMissingSkills: what they lacked most
          - improvementSuggestions: actionable advice
          - closestShortlistScore: reference point

5. For candidates far below cutoff:
      → Use deterministic fallback message (no extra API call)
```

---

### Step 5 — Aggregate Insights

Computed locally (no Gemini):

```
- skillDemand: for each skill in the pool, how many candidates have it and what's their avg score
- commonGaps: skills most frequently missing across all candidates
- scoreDistribution: histogram (0-20, 21-40, 41-60, 61-80, 81-100)
- avgScoreByCategory: pool averages per scoring dimension
- topCandidateScore, avgCandidateScore
- recommendationBreakdown: count of each recommendation level
```

---

### Step 6 — Save & Notify

```
→ Save ScreeningResult to MongoDB (one document with all data)
→ Update BackgroundJob status to "done"
→ Send SSE notification to recruiter: screening complete
→ Recruiter frontend updates in real time
```

---

## 10. Gemini Models Used

All model names are configurable via environment variables.

| Use Case | Env Variable | Default Value | Temperature | Caching |
|----------|-------------|---------------|-------------|---------|
| Resume parsing (PDF) | `RESUME_PARSER_MODEL` | gemini-2.0-flash | 0.1 | No |
| Job enhancement | `SCREENING_MODEL` | gemini-2.0-flash | 0.3 | Yes (1hr TTL) |
| Candidate batch evaluation | `SCREENING_MODEL` | gemini-2.0-flash | 0.2 | Yes (1hr TTL) |
| Re-ranking | `SCREENING_MODEL` | gemini-2.0-flash | 0.2 | Yes (1hr TTL) |
| Rejection reason generation | `SCREENING_MODEL` | gemini-2.0-flash | 0.4 | Yes (1hr TTL) |

**Extended Thinking (optional):**
- Enabled if `SCREENING_THINKING_BUDGET` > 0 in environment
- Adds a thinking trace log per batch stored in `ScreeningResult.thinkingLog`
- Disabled automatically on fallback models

**Fallback Models:**
- `SCREENING_FALLBACK_MODELS` — comma-separated list tried in order if primary fails
- `RESUME_PARSER_FALLBACK_MODELS` — same for resume parsing
- Thinking mode is disabled on fallback models

**Rate Limiting (rateLimitService):**
- Max 1 concurrent Gemini request at a time (prevents quota exhaustion)
- Request queue of up to 50 pending calls
- Max 3 retries with exponential backoff: `3000ms × 2^attempt + jitter`
- If 429 / quota exceeded: pauses entire queue, waits for API-reported reset time
- Result caching: 1-hour TTL to avoid redundant API calls for identical inputs

---

## 11. Bias Detection & Risk Detection

### Bias Flags (detected during Gemini evaluation)

Gemini is instructed to flag these patterns in candidate data:

| Flag Type | What It Means |
|-----------|--------------|
| GENDER_LANGUAGE | Resume or context uses gendered language that could influence evaluation |
| AGE_INDICATOR | Graduation year, years of experience, or other signals that reveal or imply age |
| LOCATION_BIAS | Candidate location may be unfairly disadvantaging them |
| INSTITUTION_PRESTIGE_BIAS | Evaluation weight placed on university name/reputation rather than skills |
| NAME_BIAS | Name may signal ethnicity or gender that could unconsciously influence scoring |

Each flag includes: `type`, `signal` (the specific text that triggered it), `recommendation` (how the recruiter should handle it).

### Risk Flags (detected in preprocessing, shown in results)

| Flag Type | Severity | What It Means |
|-----------|----------|--------------|
| SKILL_UNVERIFIED | medium | Claims high-level skill with no supporting evidence in work history |
| SHORT_TENURE | medium/high | Pattern of leaving jobs quickly |
| EMPLOYMENT_GAP | medium/high | Significant gap in employment history |
| MISSING_CRITICAL_SKILL | high | Missing several must-have skills for the role |
| OVERQUALIFIED | low | May leave quickly if underchallenged |
| LOCATION_MISMATCH | low | Location may conflict with job requirements |

---

## 12. Real-Time Notifications (SSE)

Long-running operations (screening, PDF parsing, CSV import) run asynchronously and stream progress to the frontend.

```
Client connects to: GET /api/notifications/stream?token=<JWT>
  → Server registers this Response object as an SSE client for this user
  → Keeps connection open (no timeout)

During screening:
  → backgroundJobService.sendNotificationToUser(userId, event)
  → Writes: data: {"type":"job_update","jobId":"...","progress":45,"status":"evaluating","message":"Evaluated 45 of 100 candidates"}\n\n

Client receives events:
  → Updates progress bar in real time
  → When status === "done", triggers result fetch
  → When status === "failed", shows error message
```

---

## 13. Analytics & Dashboard

### Dashboard Stats (`GET /api/analytics/dashboard`)

Aggregates across all jobs and screenings:

- Total jobs, total candidates, total screenings
- Average candidate score across all pools
- Top 10 most demanded skills
- Top 10 most common skill gaps
- Recommendation breakdown (how many Strongly Recommended, Recommended, etc.)
- Score distribution histogram

### Per-Job Analytics (`GET /api/analytics/job/:jobId`)

- Score trend: average score per screening run over time (shows if candidate quality is improving)
- Latest shortlist with scores
- Skill demand and gap data for this specific job

---

## 14. Email System

```
POST /api/email/send
Body: {
  recipients: [{name, email}],
  subject: "Interview Invitation",
  body: "Dear {name}, we are pleased to invite you...",
  cc: ["hr@company.com"],
  replyTo: "recruiter@company.com",
  personalizedEmails: [  // optional per-recipient override
    { email: "alice@example.com", subject: "Custom subject", body: "Custom body" }
  ]
}
```

- Uses Nodemailer over SMTP (supports Gmail, SendGrid, etc.)
- Replaces `{name}` and `{candidateName}` placeholders automatically
- Sends branded HTML emails with TalentAI styling
- Returns per-recipient success/failure array

---

## 15. Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Signs and verifies JWT tokens |
| `MONGODB_URI` | MongoDB connection string |
| `GEMINI_API_KEY` | Google Gemini API key |

### AI / Screening

| Variable | Default | Purpose |
|----------|---------|---------|
| `SCREENING_MODEL` | gemini-2.0-flash | Model for evaluation, re-ranking, rejections, job enhance |
| `RESUME_PARSER_MODEL` | gemini-2.0-flash | Model for parsing PDF resumes |
| `SCREENING_THINKING_BUDGET` | 0 | Extended reasoning tokens (0 = off) |
| `SCREENING_BATCH_SIZE` | 10 | Candidates per Gemini batch call |
| `SCREENING_FALLBACK_MODELS` | (none) | Comma-separated fallback model list |
| `RESUME_PARSER_FALLBACK_MODELS` | (none) | Fallback models for resume parsing |
| `USE_AI_REJECTION_REASONS` | true | Generate AI rejection feedback |
| `GENERIC_REJECTION_MESSAGE` | (default text) | Fallback if AI rejections are off |

### Server

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Affects error verbosity |
| `FRONTEND_URL` | (none) | Additional CORS origin |
| `JWT_EXPIRES_IN` | 7d | JWT token lifetime |

### Email

| Variable | Default | Purpose |
|----------|---------|---------|
| `SMTP_HOST` | (required for email) | SMTP server hostname |
| `SMTP_PORT` | 587 | SMTP port |
| `SMTP_USER` | (required) | SMTP username |
| `SMTP_PASS` | (required) | SMTP password |
| `EMAIL_FROM_NAME` | TalentAI HR System | Sender display name |

### MongoDB Retry

| Variable | Default |
|----------|---------|
| `MONGODB_MAX_RETRIES` | 8 |
| `MONGODB_RETRY_DELAY_MS` | 2000 |
| `MONGODB_RETRY_MAX_DELAY_MS` | 30000 |

---

## 16. End-to-End Flow Summary

```
RECRUITER ACTION                      SYSTEM RESPONSE
────────────────────────────────────────────────────────────────────────

1. Register / Login
   POST /api/auth/login          →  JWT token returned

2. Create a Job
   POST /api/jobs/enhance        →  Gemini structures rough description
   POST /api/jobs                →  Job saved to MongoDB

3. Upload Resumes
   POST /api/candidates/upload/pdf
   │
   ├─ Server extracts PDF text
   ├─ Calls Gemini (RESUME_PARSER_MODEL, temp=0.1)
   │    → Returns structured TalentProfile
   ├─ Saves Candidate to MongoDB (source: "pdf")
   └─ Streams progress via SSE

4. Run Screening
   POST /api/screening/run  {jobId, shortlistSize: 10}
   │
   ├─ Returns 202 immediately
   │
   └─ Background pipeline:
       │
       ├─ STEP 1: Fetch all candidates for this job from MongoDB
       │
       ├─ STEP 2: Preprocessing (local math, no AI)
       │           → Compute raw scores (skill, experience, education,
       │             projects, availability)
       │           → Detect risk flags (gaps, short tenure, unverified)
       │
       ├─ STEP 3: Batch evaluation (Gemini, batches of 10)
       │           → AI scores each candidate across all dimensions
       │           → AI detects bias flags
       │           → AI writes reasoning, strengths, gaps
       │           → AI suggests interview questions
       │           → SSE: "Evaluated 30/100 candidates..."
       │
       ├─ STEP 4: Re-ranking (Gemini, borderline candidates only)
       │           → Cross-batch fair comparison near cutoff
       │
       ├─ STEP 5: Split → shortlist + rejected
       │
       ├─ STEP 6: Rejection reasons (Gemini, top rejected only)
       │           → whyNotSelected, improvementSuggestions
       │
       ├─ STEP 7: Aggregate insights (local, no AI)
       │           → Skill demand, common gaps, score distribution
       │
       └─ STEP 8: Save ScreeningResult to MongoDB
                  → SSE: "Screening complete"
                  → Frontend loads results automatically

5. View Results
   GET /api/screening/:id
   →  Full ranked shortlist with scores, reasoning, interview questions
   →  Every rejected candidate with "Why Not Selected" feedback
   →  Pool-level analytics and insights

6. Send Emails
   POST /api/email/send
   →  Personalized interview invitations to shortlisted candidates
```

---

*This document covers the complete TalentAI backend as of the current codebase.*
