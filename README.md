# TalentAI — Intelligent Hiring Platform

> An AI-powered talent acquisition platform that automates candidate screening, ranking, and communication using Google Gemini. Built for the **Umurava AI Hackathon**.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Core Features](#core-features)
   - [Authentication](#authentication)
   - [Job Management](#job-management)
   - [Candidate Management](#candidate-management)
   - [AI Screening Pipeline](#ai-screening-pipeline)
   - [Results & Analysis](#results--analysis)
   - [Email System](#email-system)
   - [Notifications & Real-time Updates](#notifications--real-time-updates)
   - [Analytics Dashboard](#analytics-dashboard)
   - [Network & UX Enhancements](#network--ux-enhancements)
6. [Database Models](#database-models)
7. [API Reference](#api-reference)
8. [Environment Variables](#environment-variables)
9. [Getting Started](#getting-started)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Security](#security)
12. [Known Limitations](#known-limitations)

---

## Overview

TalentAI eliminates hours of manual resume screening by running every candidate through a multi-stage Gemini AI pipeline. Recruiters post a job, upload candidates (manually, CSV, Excel, or PDF résumés), trigger screening with one click, and receive a ranked shortlist complete with scores, strengths, gaps, interview questions, and personalised rejection feedback — all in minutes.

**Key differentiators:**
- **Batch evaluation + global re-ranking** — candidates are scored in parallel batches then globally re-ranked for cross-batch fairness
- **Bias detection** — automatically flags gender language, age indicators, institution prestige bias, and name bias inside AI outputs
- **Risk flagging** — surfaces unverified skills, employment gaps, short tenures, and location mismatches
- **Transparent AI reasoning** — every score has a full thinking log that recruiters can audit
- **Personalised candidate emails** — per-candidate emails that include their exact score, strengths, gaps, and tailored interview questions, resolved per-recipient before delivery

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js 15 (App Router) · TypeScript · Tailwind CSS        │
│  Redux Toolkit · Framer Motion · Recharts · jsPDF           │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + SSE
┌────────────────────────▼────────────────────────────────────┐
│                        BACKEND                              │
│  Node.js · Express · TypeScript                             │
│  MongoDB (Mongoose) · JWT Auth · Zod Validation             │
│  Multer (file uploads) · Nodemailer (SMTP)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     AI LAYER                                │
│  Google Gemini (gemini-2.5-flash / configurable)            │
│  Preprocessing → Batch Evaluation → Re-ranking              │
│  → Rejection Reasons → Resume Parsing                       │
└─────────────────────────────────────────────────────────────┘
```

Screening runs **asynchronously** as a background job. The frontend connects via **Server-Sent Events (SSE)** and receives live progress updates without polling. The server pushes one event per batch completed, plus final `done` / `failed` events.

---

## Tech Stack

### Frontend

| Package | Purpose |
|---|---|
| Next.js 15 | App Router, SSR, file-based routing |
| React 18 | UI library |
| TypeScript | Type safety across all components and hooks |
| Tailwind CSS | Utility-first styling |
| Redux Toolkit | Global state (auth, jobs, candidates, screening, analytics) |
| Framer Motion | Animations and page transitions |
| Recharts | Score charts, radar charts, bar charts, histograms |
| jsPDF + jspdf-autotable | PDF export of screening reports |
| react-hot-toast | Toast notifications |
| lucide-react | Icon library |
| axios | HTTP client with auth interceptor |

### Backend

| Package | Purpose |
|---|---|
| Express | HTTP server and routing |
| Mongoose | MongoDB ODM |
| @google/genai | Official Gemini AI SDK |
| jsonwebtoken | JWT token creation and verification |
| bcryptjs | Password hashing (12 salt rounds) |
| multer | File upload handling (CSV, Excel, PDF) |
| csv-parser | CSV candidate import |
| xlsx | Excel (.xlsx / .xls) candidate import |
| pdf-parse | PDF résumé text extraction before AI parsing |
| nodemailer | SMTP email sending with HTML templates |
| zod | Request schema validation |
| helmet | HTTP security headers |
| express-rate-limit | API rate limiting (200 req / 15 min) |
| node-cache | In-memory result caching |

---

## Project Structure

```
TalentAi/
├── frontend/
│   └── src/
│       ├── app/                            # Next.js App Router pages
│       │   ├── layout.tsx                  # Root layout — providers, AuthGuard, NetworkBanner
│       │   ├── page.tsx                    # Redirect to /jobs
│       │   ├── login/page.tsx              # Login page
│       │   ├── signup/page.tsx             # Registration page
│       │   ├── jobs/
│       │   │   ├── page.tsx                # Jobs list
│       │   │   ├── new/page.tsx            # Create job (with AI enhance)
│       │   │   └── [id]/
│       │   │       ├── page.tsx            # Job detail with candidate list
│       │   │       └── edit/page.tsx       # Edit job
│       │   ├── candidates/
│       │   │   ├── page.tsx                # Candidate management + bulk operations
│       │   │   └── upload/page.tsx         # Dedicated bulk upload page
│       │   ├── screening/page.tsx          # Screening wizard — select job, configure, run
│       │   ├── results/
│       │   │   ├── page.tsx                # All screening history
│       │   │   └── [id]/page.tsx           # Full screening result with analysis
│       │   ├── analytics/page.tsx          # Dashboard and hiring analytics
│       │   ├── profile/page.tsx            # User profile
│       │   └── settings/page.tsx           # App settings
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx             # Main navigation sidebar
│       │   │   ├── TopNav.tsx              # Top bar — notifications, user menu
│       │   │   ├── LayoutWrapper.tsx       # Global keyboard shortcut handler
│       │   │   ├── AuthGuard.tsx           # Redirects unauthenticated users
│       │   │   └── BreadcrumbBar.tsx       # Dynamic page breadcrumbs
│       │   ├── candidates/
│       │   │   ├── CreateCandidateModal.tsx     # Add candidate form with dupe detection
│       │   │   ├── CandidateDetailModal.tsx     # View profile + score history + job match tab
│       │   │   └── CandidateUploadModal.tsx     # File upload modal (CSV, Excel, PDF)
│       │   ├── screening/
│       │   │   ├── AIThinkingReviewModal.tsx    # Full AI reasoning log viewer
│       │   │   ├── AIThinkingStream.tsx         # Live thinking token stream during screening
│       │   │   ├── ThinkingStream.tsx           # Thinking display component
│       │   │   ├── LiveLeaderboard.tsx          # Live candidate ranking during processing
│       │   │   ├── LiveScoreGauges.tsx          # Live per-category score gauges
│       │   │   ├── CandidatePreview.tsx         # Candidate preview card
│       │   │   └── CriteriaSelector.tsx         # Screening criteria / weight picker
│       │   ├── email/
│       │   │   └── EmailModal.tsx               # Email composer with 8 templates + personalisation
│       │   ├── dashboard/
│       │   │   ├── StatCard.tsx
│       │   │   ├── RecentJobs.tsx
│       │   │   ├── RecentScreenings.tsx
│       │   │   └── QuickAction.tsx
│       │   └── ui/                         # Shared UI primitives
│       │       ├── NetworkStatusBanner.tsx  # Offline / slow connection banner
│       │       ├── Button, Badge, Card, Input, Select, TextArea, Modal
│       │       ├── DragDropUpload.tsx
│       │       ├── SearchAndFilter.tsx
│       │       ├── Pagination.tsx
│       │       ├── SmartSkillInput.tsx
│       │       ├── PipelineView.tsx
│       │       ├── DraftRecoveryModal.tsx
│       │       └── LoadingState.tsx         # Skeleton loaders
│       │
│       ├── contexts/
│       │   └── NotificationsContext.tsx     # Notification state, localStorage, browser push, SSE
│       │
│       ├── store/                           # Redux slices
│       │   ├── index.ts                     # Store configuration
│       │   ├── authSlice.ts                 # Auth state + token persistence
│       │   ├── jobsSlice.ts                 # Jobs CRUD state
│       │   ├── candidatesSlice.ts           # Candidates state
│       │   ├── screeningSlice.ts            # Screening lifecycle state
│       │   └── analyticsSlice.ts            # Analytics state
│       │
│       ├── hooks/
│       │   ├── useAuth.ts                   # Auth operations
│       │   ├── useJobs.ts                   # Job CRUD
│       │   ├── useCandidates.ts             # Candidate operations
│       │   ├── useScreening.ts              # Screening flow
│       │   ├── useDashboard.ts              # Dashboard data
│       │   ├── useJobCandidates.ts          # Candidates for a specific job
│       │   ├── useNetworkStatus.ts          # Online / offline / slow connection detection
│       │   ├── useKeyboardShortcuts.ts      # Global keyboard shortcut registration
│       │   ├── useFormValidation.ts         # Form validation utilities
│       │   └── useAutoSave.ts              # Auto-save to localStorage
│       │
│       ├── lib/
│       │   ├── api.ts                       # Axios instance with Bearer token interceptor
│       │   └── utils.ts                     # cn() class merger and helpers
│       │
│       └── types/index.ts                   # All shared TypeScript interfaces
│
└── backend/
    └── src/
        ├── index.ts                         # Express app entry — middleware, CORS, rate limit
        ├── config/db.ts                     # MongoDB connection via Mongoose
        ├── routes/index.ts                  # All API routes with auth guards
        ├── middleware/
        │   ├── auth.ts                      # requireAuth — JWT verification
        │   └── errorHandler.ts             # Global error + 404 handlers
        ├── models/
        │   ├── User.ts                      # User schema with bcrypt hooks
        │   ├── Job.ts                       # Job schema with scoring weights
        │   ├── Candidate.ts                 # Full talent profile schema
        │   └── ScreeningResult.ts           # Complete screening result schema
        ├── controllers/
        │   ├── authController.ts            # register, login, getMe
        │   ├── jobController.ts             # CRUD + AI job enhancement
        │   ├── candidateController.ts       # CRUD + file upload + score history + job match
        │   ├── screeningController.ts       # Run screening, results, cancel
        │   ├── analyticsController.ts       # Dashboard stats, per-job analytics
        │   ├── emailController.ts           # Send personalised emails via SMTP
        │   └── notificationController.ts   # SSE stream, background job status
        ├── services/
        │   ├── geminiService.ts             # All Gemini prompts and the full screening pipeline
        │   ├── backgroundJobService.ts      # In-memory job queue + SSE event push
        │   ├── preprocessingService.ts      # Deterministic pre-analysis before AI evaluation
        │   ├── emailService.ts             # Nodemailer + branded HTML email builder
        │   └── rateLimitService.ts         # Gemini quota manager with retry/fallback
        ├── validators/index.ts              # Zod schemas for all request bodies
        └── types/index.ts                   # Shared backend TypeScript types
```

---

## Core Features

### Authentication

- **JWT-based auth** — tokens stored in `localStorage`, sent via `Authorization: Bearer <token>` on every request
- **Register / Login** — email + password with bcrypt hashing (12 salt rounds)
- **Roles** — `recruiter` (default) and `admin`
- **Protected routes** — `AuthGuard` component wraps the entire app and redirects unauthenticated users to `/login`
- **Auth persistence** — Redux `authSlice` rehydrates the token from localStorage on every page load
- **Token validation** — a failed 401 response automatically clears the stored token and redirects to login

---

### Job Management

Jobs are the foundation of TalentAI — they define what the AI evaluates candidates against.

**Fields per job:**

| Field | Type | Notes |
|---|---|---|
| title | String | Required |
| description | String | Full job description |
| department | String | Optional |
| location | String | Required |
| type | Enum | Full-time / Part-time / Contract / Freelance |
| experienceLevel | Enum | Junior / Mid-level / Senior / Lead / Executive |
| requirements | Array | Each: `{ skill, level, yearsRequired, required }` |
| niceToHave | String[] | Bonus skills that don't block scoring |
| responsibilities | String[] | Duties list |
| salaryRange | Object | `{ min, max, currency }` |
| weights | Object | Custom scoring weights (see below) |

**Custom scoring weights:**

Recruiters can adjust how much each dimension counts toward the final score. Weights must sum to 100.

| Category | Default |
|---|---|
| Skills match | 35% |
| Experience | 30% |
| Education | 15% |
| Projects | 15% |
| Availability | 5% |

**AI Job Enhancement (`POST /jobs/enhance`):**  
Sends the raw job title and description to Gemini, which returns an enriched version with structured skill requirements, responsibilities, nice-to-haves, and suggested scoring weights — saving recruiters significant setup time.

---

### Candidate Management

Candidates are talent profiles linked to a specific job. Every candidate goes through the same AI pipeline regardless of how they were added.

**Ways to add candidates:**

| Method | Endpoint | Notes |
|---|---|---|
| Manual form | `POST /candidates` | Full profile with all fields |
| JSON bulk import | `POST /candidates/bulk` | Array of profile objects |
| CSV / Excel upload | `POST /candidates/upload/csv` | Columns mapped to profile fields |
| PDF résumés | `POST /candidates/upload/pdf` | Up to 20 PDFs per batch; Gemini parses each into a structured profile |

**Candidate profile fields:**

- **Personal:** firstName, lastName, email (unique), phone, headline, bio, location
- **Skills:** name, level (Beginner / Intermediate / Advanced / Expert), years of experience
- **Experience:** company, role, start/end dates, current flag, description, technologies, achievements
- **Education:** institution, degree, field of study, start/end year, GPA
- **Certifications:** name, issuer, issue/expiry date, credential URL
- **Projects:** name, description, technologies used, role, link, impact statement
- **Availability:** status (Available / Open to Opportunities / Not Available), type, notice period, preferred start date
- **Social links:** LinkedIn, GitHub, portfolio, Twitter

**Duplicate email detection:**  
While filling the create-candidate form, a debounced request (600ms) fires to `GET /candidates/check-duplicate?email=X`. If the email already exists, an amber warning banner appears below the email field — preventing duplicate entries before the form is submitted.

**Candidate score history:**  
`GET /candidates/:id/score-history` queries every past `ScreeningResult` document for that candidate and returns a timeline of scores across all jobs they have been screened for. Displayed as a bar chart inside the candidate detail modal.

**On-demand job matching:**  
`POST /candidates/:id/match-job` with `{ jobId }` runs the full Gemini single-candidate scoring pipeline and returns a score breakdown without triggering a full screening run. Useful for quickly checking fit before running a batch.

---

### AI Screening Pipeline

The core of TalentAI. Triggered via `POST /screening/run`.

#### Stage 1 — Preprocessing (No AI, deterministic)

Before any Gemini call, every candidate is preprocessed locally to reduce token cost and improve AI accuracy:

- **Skill normalisation** — `React.js` → `react`, `Node.js` → `nodejs`, `TypeScript` → `ts`, etc.
- **Preliminary skill match** — flags which required skills are matched vs missing
- **Experience calculation** — total months of professional experience computed from date ranges
- **Risk pre-flagging:**
  - Employment gaps > 6 months
  - Short tenures < 3 months
  - Location mismatches with job location
  - Missing critical (required=true) skills
  - Potential overqualification signals

Sending pre-computed numeric signals to Gemini reduces hallucination and gives the model factual anchors to reason from.

#### Stage 2 — Batch Evaluation

Candidates are evaluated in configurable batches (default: 10 per batch). For each batch, Gemini receives:
- Full job description + requirements + custom weights
- Preprocessed candidate profiles
- A strict JSON response schema

Gemini returns per-candidate:

| Field | Type | Description |
|---|---|---|
| `finalScore` | 0–100 | Weighted composite score |
| `breakdown` | Object | Per-category sub-scores |
| `confidenceScore` | 0–100 | Model's self-reported certainty |
| `strengths` | String[] | What impressed the model |
| `gaps` | String[] | Where the candidate falls short |
| `risks` | String[] | Concerns to investigate |
| `recommendation` | Enum | Strongly Recommended / Recommended / Consider / Not Recommended |
| `summary` | String | One-paragraph assessment |
| `reasoning` | String | Detailed per-criterion reasoning |
| `interviewQuestions` | String[] | 5 questions tailored to the specific candidate's profile |
| `skillGapAnalysis` | Object | `{ matched, missing, bonus }` skills |
| `biasFlags` | Array | Gender language, age indicators, institution prestige, name bias |
| `riskFlags` | Array | Unverified skills, short tenure, gaps, location mismatch, overqualified |

#### Stage 3 — Global Re-ranking

After all batches complete, Gemini performs a global re-evaluation of the full ranked list to:
- Correct inter-batch score calibration inconsistencies
- Ensure the final ordering is globally fair and consistent
- Assign definitive ranks

#### Stage 4 — Rejection Reasons

For every candidate who did not make the shortlist, Gemini generates:

- `whyNotSelected` — a specific, honest explanation based on the candidate's actual profile (not a generic message)
- `topMissingSkills` — the key skills that would have changed the outcome
- `improvementSuggestions` — 3–5 actionable steps for the candidate to improve
- `scoreGap` — how many points below the shortlist cutoff they scored
- `closestShortlistScore` — the score of the weakest shortlisted candidate

This stage is configurable: set `USE_AI_REJECTION_REASONS=false` in the backend `.env` to use a single generic message for all rejected candidates instead.

#### Async Execution + SSE Live Updates

Screening runs as a **background job** so the frontend stays fully responsive:

1. `POST /screening/run` creates a background job and returns immediately with `{ jobId }`
2. The frontend opens a persistent SSE connection to `GET /notifications/stream?token=JWT`
3. As each batch completes, the backend pushes a progress event: `{ status: "running", message: "Evaluating batch 2 of 4…" }`
4. When screening finishes: `{ status: "done", result: { screeningResultId } }`
5. The frontend navigates automatically to the result page

**Cancellation:** `POST /background-jobs/:jobId/cancel` stops an in-progress screening job between batch cycles.

#### Gemini Configuration

| Variable | Default | Purpose |
|---|---|---|
| `SCREENING_MODEL` | gemini-2.5-flash | Model for candidate evaluation |
| `RESUME_PARSER_MODEL` | gemini-2.5-flash | Model for PDF résumé parsing |
| `SCREENING_THINKING_BUDGET` | 0 | Extended thinking tokens (0 = disabled) |
| `SCREENING_BATCH_SIZE` | 10 | Candidates per evaluation batch |
| `SCREENING_FALLBACK_MODELS` | (empty) | Comma-separated fallback models when quota exceeded |
| `USE_AI_REJECTION_REASONS` | true | Per-candidate vs generic rejection messages |

**Rate limit management:** `rateLimitService` queues all Gemini requests, detects 429 quota errors, pauses the queue, resets after the quota window, and tries fallback models automatically if configured.

---

### Results & Analysis

The results page (`/results/:id`) is a full analytics dashboard for a completed screening run.

#### Shortlist Table

- Ranked list showing score bar, recommendation badge, confidence score
- **Expandable row** — click any row to expand and see:
  - Radar chart of score breakdown (5 axes)
  - Skill gap analysis: matched / missing / bonus skills
  - Interview questions tailored to that candidate
  - Strengths, gaps, risks in formatted lists
  - Bias flags and risk flags with severity indicators
- **Pipeline stage tracking** — each candidate can be moved through stages:
  - New → Interview → On Hold → Offer → Hired / Pass
- **Bulk selection** — select multiple candidates to export PDF or email them all at once
- **Filter by recommendation** — Strongly Recommended / Recommended / Consider / Not Recommended
- **Sort by** — final score, confidence score, or skills sub-score

#### Rejected Candidates Table

- Collapsible section showing all non-shortlisted candidates
- Per-candidate: rejection reason, top missing skills, score gap from cutoff, improvement suggestions
- Email button on each row to send personalised feedback directly

#### Candidate Comparison

Select 2 or more candidates from either the shortlisted or rejected pools using the Scale (⚖) button. A floating "Compare" bar appears at the bottom. Clicking it opens a side-by-side comparison modal showing:
- Final score and recommendation for each
- Score breakdown radar chart
- Skills: matched, missing, bonus
- Strengths, gaps, risks

#### PDF Export

Select any shortlisted candidates → "Export PDF". Generates a branded professional report using jsPDF containing:
- Cover page with job title, screening date, and summary statistics
- Per-candidate page with scores, breakdown table, strengths, gaps, and interview questions

#### AI Thinking Log

A separate modal ("View AI Reasoning") shows the raw Gemini thinking output for every batch stage — full transparency into how each decision was made. Useful for auditing and bias review.

#### Aggregate Insights Panel

- Score distribution histogram
- Skill demand chart — which skills appear most, with average score per skill
- Common gaps chart — top skills missing across all candidates
- Average scores by category
- Recommendation breakdown

---

### Email System

A full email composer accessible from the results page (shortlisted and rejected candidates), the candidate list, and the job detail page.

#### Email Templates (8 total)

| Label | Color | Use case |
|---|---|---|
| Interview | Blue | Invite candidate to interview stage |
| Shortlisted | Emerald | Inform candidate they made the shortlist |
| Offer | Violet | Formal job offer letter |
| Regret | Rose | Standard rejection notice |
| Follow-Up | Amber | Status update while review is ongoing |
| **Evaluation+** | Teal | Personalised shortlist email with score, strengths, interview questions |
| **Feedback** | Slate | Personalised rejection email with score, why not selected, skills to develop |
| Custom | Gray | Free-form email with no pre-filled content |

#### Personalisation Variables

All variables are resolved **per recipient** at send time — each candidate receives a unique email with their own data:

| Variable | Resolves to |
|---|---|
| `{name}` | Recipient's full name |
| `{jobTitle}` | The job title |
| `{score}` | Candidate's final score (0–100) |
| `{recommendation}` | Strongly Recommended / Recommended / etc. |
| `{strengths}` | Numbered list of candidate's key strengths |
| `{gaps}` | Numbered list of areas for development |
| `{interviewQuestions}` | Numbered list of tailored interview questions |
| `{improvements}` | Numbered list of improvement suggestions |
| `{whyNotSelected}` | Specific reason candidate was not selected |
| `{missingSkills}` | Comma-separated list of missing skills |
| `{rank}` | Candidate's rank number |

#### Auto Template Selection

- Clicking email on a **shortlisted candidate** → modal opens with **Evaluation+** template pre-selected, all AI fields pre-populated from the screening result
- Clicking email on a **rejected candidate** → modal opens with **Feedback** template pre-selected with rejection data pre-filled

#### Preview Tab

The modal has a Compose / Preview toggle. The Preview tab renders up to 3 personalised email previews — one per recipient — showing exactly what each candidate will receive with all variables resolved.

#### Sending

Per-recipient personalised bodies are fully resolved on the frontend. The backend receives a `personalizedEmails` array with a pre-resolved `{ name, email, subject, body }` object per recipient. SMTP delivery uses a branded HTML wrapper with the TalentAI logo and signature. Send results are shown per-recipient (green = sent, red = failed with error detail).

---

### Notifications & Real-time Updates

#### In-App Notification Centre

Accessible via the bell icon in the top navigation bar.

**Categories with colour-coded icons:**

| Category | Icon colour | Trigger |
|---|---|---|
| screening | Purple | Screening started / completed / failed |
| upload | Blue | File upload (PDF, CSV) completed |
| job | Teal | Job created |
| candidate | Amber | Candidate created or deleted |
| email | Blue | Email(s) sent |
| system | Gray | General system messages |

**Features:**
- Unread count badge on the bell icon
- "Mark all read" button in the panel header
- Click any notification to navigate to the related resource
- All notifications persist in `localStorage` (capped at 50, newest-first)

#### Browser Push Notifications

- Click "Enable push notifications" in the notification panel to request permission
- Fires an OS-level push when a screening job finishes or fails — **only when the browser tab is not active**, so active users are not double-notified
- If permission is `denied`, a red warning banner appears with instructions to re-enable in browser settings

#### SSE Live Updates

The frontend maintains a persistent SSE connection to `/notifications/stream?token=JWT` (token passed as a query parameter because `EventSource` does not support custom headers). The backend pushes job progress events as they happen — no polling required.

---

### Analytics Dashboard

`GET /analytics/dashboard` returns aggregated statistics across all jobs and screenings:

- Total jobs count, active jobs count
- Total candidates, candidates added this month
- Total screening runs
- Average candidate score across all screenings
- Recent job postings with candidate counts
- Recent screening runs with shortlist size and top score

Per-job analytics (`GET /analytics/job/:jobId`):
- Candidate score distribution for that role
- Skill demand chart — which skills candidates have, at what average score
- Common gaps in the candidate pool for that job

---

### Network & UX Enhancements

#### Offline / Low Internet Banner

A small pill at the bottom-centre of the screen (above all other content) shows connection state:

| State | Colour | Message |
|---|---|---|
| Offline | Red | No internet connection |
| Slow connection | Yellow | Slow connection detected |
| Back online | Green | Back online (disappears after 3 s) |

Implemented via a custom `useNetworkStatus` hook using the `online` / `offline` browser events and the Network Information API (`navigator.connection`). Uses a `mounted` state pattern to avoid SSR/CSR hydration mismatches (returns `null` until the component has mounted client-side).

#### Keyboard Shortcuts

Available anywhere in the app when focus is not inside a form field:

| Key | Action |
|---|---|
| `N` | Open New Job modal (from /jobs) or navigate to /jobs and open it |
| `/` | Focus the search bar |
| `G` | Navigate to Screening page |

Shortcuts are suppressed when focus is inside any `<input>`, `<textarea>`, `<select>`, or `contentEditable` element to avoid interfering with typing.

#### Draft Recovery

Form data in the New Job form is auto-saved to `localStorage` every time a field changes. If the user accidentally navigates away, a `DraftRecoveryModal` appears on the next visit offering to restore the saved draft.

#### Skeleton Loaders

All list views (jobs, candidates, results, analytics) and detail pages show skeleton loading states while data fetches. No blank screens, no content layout shifts, no visible spinners on main content areas.

---

## Database Models

### User

```
name         String   required
email        String   required, unique, lowercased
password     String   bcrypt hashed, min 8 characters, excluded from queries by default
role         Enum     "recruiter" | "admin"  (default: "recruiter")
createdAt    Date     auto
updatedAt    Date     auto
```

### Job

```
title            String   required
description      String   required
department       String   optional
location         String   required
type             Enum     "Full-time" | "Part-time" | "Contract" | "Freelance"
experienceLevel  Enum     "Junior" | "Mid-level" | "Senior" | "Lead" | "Executive"
requirements     Array    [{ skill, level, yearsRequired, required }]
niceToHave       String[]
responsibilities String[]
salaryRange      Object   { min, max, currency }
weights          Object   { skills:35, experience:30, education:15, projects:15, availability:5 }
isActive         Boolean  default: true
createdAt        Date     auto
updatedAt        Date     auto
```

Indexes: text index on `title + description`, compound index on `isActive + createdAt`.

### Candidate (TalentProfile)

```
firstName / lastName   String   required
email                  String   required, unique, lowercased
phone / headline / bio String   optional
location               String   optional
jobId                  ObjectId ref: Job, required
skills        [{ name, level, yearsOfExperience }]
languages     [{ name, proficiency }]
experience    [{ company, role, startDate, endDate, isCurrent, description, technologies, achievements }]
education     [{ institution, degree, fieldOfStudy, startYear, endYear, gpa }]
certifications [{ name, issuer, issueDate, expiryDate, credentialUrl }]
projects      [{ name, description, technologies, role, link, startDate, endDate, impact }]
availability  { status, type, noticePeriod, preferredStartDate }
socialLinks   { linkedin, github, portfolio, twitter }
source        Enum     "platform" | "csv" | "pdf" | "json"
parsedResumeText String  raw extracted text from PDF before AI parsing
createdAt     Date     auto
updatedAt     Date     auto
```

Indexes: `skills.name` (for skill-based search), `createdAt` descending.

### ScreeningResult

```
jobId / jobTitle          String   required
totalApplicants           Number
shortlistSize             Number
shortlist                 [CandidateScore]
rejectedCandidates        [RejectedCandidate]
aggregateInsights         Object   (see below)
screeningDate             Date     default: now
aiModel                   String   model name used
processingTimeMs          Number   total screening duration
thinkingLog               [{ stage, batchIndex, batchLabel, candidateNames, thinking, timestamp }]
createdAt                 Date     auto
```

**CandidateScore fields (shortlist):**
```
finalScore, rank, breakdown (5 sub-scores), confidenceScore
strengths[], gaps[], risks[], recommendation, summary, reasoning
interviewQuestions[], skillGapAnalysis { matched, missing, bonus }
biasFlags [{ type, signal, recommendation }]
riskFlags [{ type, detail, severity }]
```

**RejectedCandidate additional fields:**
```
whyNotSelected, topMissingSkills[], improvementSuggestions[]
scoreGap, closestShortlistScore
```

**aggregateInsights:**
```
skillDemand        [{ skill, count, avgScore }]
commonGaps         [{ skill, missingCount }]
scoreDistribution  [{ range, count }]
avgScoreByCategory { skillsScore, experienceScore, educationScore, projectsScore, availabilityScore }
topCandidateScore  Number
avgCandidateScore  Number
recommendationBreakdown  Map<String, Number>
```

Indexes: `jobId + createdAt` compound index.

---

## API Reference

All endpoints (except `/auth/*` and `/notifications/stream`) require `Authorization: Bearer <token>`.

### Auth
```
POST  /api/auth/register   { name, email, password }  →  { token, user }
POST  /api/auth/login      { email, password }         →  { token, user }
GET   /api/auth/me                                     →  { user }
```

### Jobs
```
GET    /api/jobs                 ?page, ?limit, ?search        →  { jobs, total }
POST   /api/jobs                 { title, description, ... }   →  { job }
POST   /api/jobs/enhance         { title, description }        →  { enhancedJob }
GET    /api/jobs/:id                                            →  { job }
PUT    /api/jobs/:id             { ...fields }                  →  { job }
DELETE /api/jobs/:id                                            →  { message }
```

### Candidates
```
GET    /api/candidates                          ?jobId, ?search, ?page    →  { candidates, total }
GET    /api/candidates/stats                                               →  { total, bySource, recentCount }
GET    /api/candidates/check-duplicate          ?email=X                  →  { exists, candidate? }
POST   /api/candidates                          { ...profile }             →  { candidate }
POST   /api/candidates/bulk                     [{ ...profile }]          →  { imported, failed }
POST   /api/candidates/upload/csv               form-data: file            →  { imported, failed }
POST   /api/candidates/upload/pdf               form-data: files[]         →  { imported, failed }
GET    /api/candidates/:id                                                 →  { candidate }
GET    /api/candidates/:id/score-history                                   →  [{ jobId, jobTitle, date, score, ... }]
POST   /api/candidates/:id/match-job            { jobId }                  →  { score, breakdown, ... }
PUT    /api/candidates/:id                      { ...fields }              →  { candidate }
PATCH  /api/candidates/:id                      { ...fields }              →  { candidate }
DELETE /api/candidates/:id                                                 →  { message }
```

### Screening
```
POST   /api/screening/run                  { jobId, shortlistSize, weights? }  →  { jobId, message }
GET    /api/screening                      ?page, ?limit                        →  { results, total }
GET    /api/screening/:id                                                        →  { result }
DELETE /api/screening/:id                                                        →  { message }
GET    /api/screening/job/:jobId/latest                                          →  { result }
GET    /api/screening/:resultId/why/:email                                       →  { whyNotSelected, improvements }
```

### Analytics
```
GET    /api/analytics/dashboard          →  { stats, recentJobs, recentScreenings }
GET    /api/analytics/job/:jobId         →  { skillDemand, commonGaps, scoreDistribution }
```

### Email
```
POST   /api/email/send
  Body: {
    recipients:          [{ name, email }]       // required
    subject:             String                   // required
    body:                String                   // required (fallback template)
    cc?:                 String[]
    replyTo?:            String
    personalizedEmails?: [{ name, email, subject, body }]  // pre-resolved per-recipient
  }
  Response: { message, sent, failed, results: [{ email, success, error? }] }
```

### Notifications / Background Jobs
```
GET    /api/notifications/stream?token=JWT    SSE stream of job update events
GET    /api/background-jobs/:jobId            { job }  — poll job status
POST   /api/background-jobs/:jobId/cancel     { message }  — cancel running job
```

### System
```
GET    /api/system/health    →  { status, gemini: { queueLength, activeRequests, isQuotaExceeded, quotaResetIn } }
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/talentai

# Authentication
JWT_SECRET=your_jwt_secret_at_least_32_characters_long

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
SCREENING_MODEL=gemini-2.5-flash
RESUME_PARSER_MODEL=gemini-2.5-flash
SCREENING_THINKING_BUDGET=0
SCREENING_BATCH_SIZE=10
SCREENING_FALLBACK_MODELS=gemini-1.5-flash,gemini-1.5-pro
USE_AI_REJECTION_REASONS=true
GENERIC_REJECTION_MESSAGE=Thank you for your application...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password_or_smtp_password
EMAIL_FROM_NAME=TalentAI HR System

# CORS
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB (local installation or MongoDB Atlas)
- A Google Gemini API key ([get one here](https://aistudio.google.com))
- SMTP credentials (Gmail with App Password, SendGrid, Resend, etc.)

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
# Backend — copy the example and fill in your values
cp backend/.env.example backend/.env

# Frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > frontend/.env.local
```

Required values to fill in: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`.

### 3. Start development servers

```bash
# Terminal 1 — Backend (runs on port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (runs on port 3000)
cd frontend
npm run dev
```

### 4. Open the app

Navigate to `http://localhost:3000`, register an account, and start hiring.

**Quick start workflow:**
1. Create a job → click "AI Enhance" to auto-fill requirements
2. Add candidates via CSV upload or manual entry
3. Go to Screening → select the job → click Run
4. Watch live progress in the SSE stream
5. Review the ranked results page
6. Email shortlisted candidates with the Evaluation+ template

---

## Keyboard Shortcuts

| Key | Action | Notes |
|---|---|---|
| `N` | Open New Job form | Ignored when typing in any input |
| `/` | Focus the search bar | Ignored when typing in any input |
| `G` | Navigate to Screening page | Ignored when typing in any input |

---

## Security

- **JWT tokens** — HS256 signed with a secret; required on all non-auth routes via `Authorization: Bearer`
- **Password hashing** — bcrypt with 12 salt rounds; password field excluded from all DB queries by default
- **HTTP headers** — Helmet sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, and other security headers on every response
- **Rate limiting** — 200 requests per 15-minute window per IP (via `express-rate-limit`); reverse proxy trusted for correct IP detection
- **File upload validation** — only CSV, PDF, and Excel MIME types accepted; max 20 MB per upload; max 20 PDF files per batch
- **Request validation** — Zod schemas validate all `POST` / `PUT` request bodies before they reach controllers; invalid requests are rejected with a descriptive 400 error
- **CORS** — strict origin whitelist; only the configured `FRONTEND_URL` and `localhost:3000/3001` are allowed

---

## Known Limitations

- **Gemini quota** — free-tier API keys hit rate limits quickly. With 50+ candidates across 3–4 prompt stages, screening may take 2–5 minutes due to quota queuing. A paid API key removes this bottleneck.
- **PDF parsing accuracy** — Gemini extracts structured data from raw PDF text. Scanned / image-only PDFs will produce empty or partial profiles because no OCR pre-processing is applied.
- **In-memory background jobs** — the background job queue and SSE client registry are stored in memory and reset on server restart. Running screenings are lost if the server restarts mid-job.
- **No real-time collaboration** — screening results are per-user session; concurrent recruiters working the same job do not see each other's in-progress results without a page refresh.
- **Email delivery** — relies entirely on the configured SMTP provider. No fallback, retry queue, or delivery tracking beyond the SMTP response.
- **Bias detection is advisory** — the system flags potential bias language it detects in its own outputs, but cannot guarantee objective outcomes. Human review of shortlists is always required.

---

*Built with for the Umurava AI Hackathon.*
