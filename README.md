# TalentAI — AI-Powered Talent Screening System

> An intelligent recruiter co-pilot for the **Umurava AI Hackathon** — powered by Gemini 2.0 Flash.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RECRUITER BROWSER                           │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Job Manager │  │  Candidate   │  │  Results & Analytics     │  │
│  │  + AI Enhance│  │  Upload (CSV/│  │  - Ranked Shortlist      │  │
│  │             │  │  PDF / JSON) │  │  - Why Not Selected?      │  │
│  └──────┬──────┘  └──────┬───────┘  │  - Bias Detection         │  │
│         │                │          │  - Confidence Scores       │  │
│         └────────────────┘          │  - Interview Questions     │  │
│                  │                  │  - Aggregate Charts        │  │
│   Next.js 15  ───┼──────────────────┘                            │  │
│   Redux Toolkit  │                                               │  │
│   Tailwind CSS   │ REST API calls                                │  │
└──────────────────┼───────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPRESS API SERVER                           │
│                                                                     │
│  /api/auth          /api/jobs           /api/candidates             │
│  /api/screening     /api/analytics      /api/jobs/enhance           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    SCREENING PIPELINE                         │  │
│  │                                                              │  │
│  │  1. PREPROCESSING SERVICE                                    │  │
│  │     • Normalize skill levels → numeric signals               │  │
│  │     • Compute skill match ratio per candidate                │  │
│  │     • Detect risks (unverified skills, gaps, short tenures)  │  │
│  │     • Pre-score candidates to guide AI focus                 │  │
│  │                          ↓                                   │  │
│  │  2. GEMINI AI ORCHESTRATION                                  │  │
│  │     • Batch candidates (25/batch) into structured prompt     │  │
│  │     • Prompt 1: Job Understanding (enhance job descriptions) │  │
│  │     • Prompt 2: Multi-Candidate Evaluation                   │  │
│  │       - Scores (skills/exp/edu/projects/availability)        │  │
│  │       - Confidence score (how certain AI is)                 │  │
│  │       - Bias detection flags                                 │  │
│  │       - Strengths, gaps, risks                               │  │
│  │       - Interview questions tailored per candidate           │  │
│  │     • Prompt 3: Final Ranking + Why Not Selected             │  │
│  │                          ↓                                   │  │
│  │  3. RANKING ENGINE                                           │  │
│  │     • Sort by weighted composite score                       │  │
│  │     • Assign final ranks 1–N                                 │  │
│  │     • Compute aggregate cohort insights                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Node.js + Express + TypeScript                                     │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────┐     ┌──────────────────────┐
│   MongoDB Atlas  │     │   Gemini 2.0 Flash    │
│                 │     │   (Google AI Studio)  │
│  • Users        │     │                      │
│  • Jobs         │     │  temperature: 0.2     │
│  • Candidates   │     │  JSON mode enabled    │
│  • Screening    │     │  Batch: 25 per call   │
│    Results      │     └──────────────────────┘
└─────────────────┘
```

---

## AI Decision Flow

```
User selects Job + runs screening
         │
         ▼
[Preprocessing Service]
  For each candidate:
  ├── Normalize skills (Beginner=25, Intermediate=55, Advanced=80, Expert=100)
  ├── Match skills vs job requirements → skillMatchRatio
  ├── Calculate total experience months
  ├── Detect risks (unverified skills, employment gaps, short tenures)
  └── Pre-score (raw signals, not final)
         │
         ▼
[Gemini Evaluation Batch — Prompt 2]
  Input: Pre-processed candidates + job context + weights
  Output per candidate:
  ├── finalScore (weighted composite 0-100)
  ├── breakdown (skills/exp/edu/projects/availability)
  ├── confidenceScore (how certain AI is)
  ├── strengths[], gaps[], risks[]
  ├── recommendation (Strongly Recommended → Not Recommended)
  ├── summary + reasoning (recruiter-ready text)
  ├── interviewQuestions[] (3 targeted per candidate)
  ├── skillGapAnalysis (matched/missing/bonus)
  └── biasFlags[] (detected language bias)
         │
         ▼
[Ranking Engine]
  Sort by finalScore → assign ranks → select Top N
         │
         ▼
[Prompt 3 — Why Not Selected]
  For each rejected candidate:
  ├── whyNotSelected (clear, honest explanation)
  ├── topMissingSkills[]
  ├── closestShortlistScore (how close they were)
  └── improvementSuggestions[] (actionable advice)
         │
         ▼
[Aggregate Insights Computed]
  ├── skillDemand (most common matched skills)
  ├── commonGaps (most frequently missing skills)
  ├── scoreDistribution (histogram by range)
  ├── avgScoreByCategory
  └── recommendationBreakdown
         │
         ▼
[Saved to MongoDB → Returned to Frontend]
```

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Screening** | Gemini 2.0 Flash evaluates any number of candidates |
| **Custom Weights** | Per-job configurable scoring weights (Skills/Exp/Edu/Projects/Availability) |
| **AI Job Enhancer** | Paste a rough job description → AI rewrites + extracts requirements |
| **Resume Parsing** | Upload PDF resumes → AI extracts structured profiles |
| **CSV/Excel Import** | Bulk import candidates from spreadsheets |
| **JSON Bulk Import** | Import structured Umurava talent profiles directly |
| **Confidence Score** | AI rates how confident it is in each assessment (0-100) |
| **Bias Detection** | Flags gender-coded language, age indicators, institution prestige bias |
| **"Why Not Selected?"** | Every rejected candidate gets a transparent, constructive explanation |
| **Interview Questions** | 3 tailored questions generated per shortlisted candidate |
| **Skill Gap Analysis** | Matched / missing / bonus skills per candidate |
| **Risk Detection** | Flags unverified skills, employment gaps, short tenures |
| **Cohort Insights** | Score distributions, skill demand, common gaps across the pool |
| **Analytics Dashboard** | 5 charts: top skills, gaps, recommendation breakdown, sources, top vs avg radar |
| **Auth** | JWT-based auth with bcrypt password hashing |
| **Rate Limiting** | AI endpoints rate limited to prevent abuse |

---

## Project Structure

```
TalentAi/
├── backend/
│   ├── src/
│   │   ├── config/db.ts              # MongoDB connection
│   │   ├── types/index.ts            # All TypeScript interfaces
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Job.ts                # Includes ScoringWeights
│   │   │   ├── Candidate.ts          # Full Umurava schema
│   │   │   └── ScreeningResult.ts    # With biasFlags, confidenceScore, rejectedCandidates
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── jobController.ts      # Includes enhanceJob via Gemini
│   │   │   ├── candidateController.ts # CSV, PDF, JSON ingestion
│   │   │   ├── screeningController.ts # Pipeline orchestration
│   │   │   └── analyticsController.ts # Aggregate stats
│   │   ├── services/
│   │   │   ├── geminiService.ts      # 3 AI prompts + resume parser
│   │   │   └── preprocessingService.ts # Signal extraction before AI
│   │   ├── middleware/auth.ts        # JWT verification
│   │   ├── routes/index.ts           # All routes
│   │   └── index.ts                  # Server entry
│   └── .env.example
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # Dashboard
│       │   ├── login/, signup/       # Auth pages
│       │   ├── jobs/                 # List, detail, new, edit
│       │   ├── candidates/           # List, upload (CSV/PDF/JSON)
│       │   ├── screening/            # AI screening config + progress
│       │   ├── results/              # Results list + detail with all features
│       │   └── analytics/           # 5 charts dashboard
│       ├── components/layout/        # Sidebar, AuthGuard
│       ├── store/                    # Redux slices (auth, jobs, candidates, screening, analytics)
│       ├── types/index.ts            # Frontend type definitions
│       └── lib/api.ts               # Axios client
│
├── sample-data/
│   └── candidates.json              # 3 sample talent profiles
│
└── README.md
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier works)
- Gemini API key — [aistudio.google.com](https://aistudio.google.com)

### 1. Clone & Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGODB_URI, GEMINI_API_KEY, JWT_SECRET
npm run dev
# API running at http://localhost:5000
```

### 2. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev
# App running at http://localhost:3000
```

### 3. Seed sample data

```bash
# After creating an account, import sample candidates:
curl -X POST http://localhost:5000/api/candidates/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample-data/candidates.json
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new recruiter |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get current user |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create job |
| POST | `/api/jobs/enhance` | **AI** — enhance job description |
| GET | `/api/jobs/:id` | Get job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |

### Candidates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates` | List (paginated, searchable) |
| POST | `/api/candidates` | Create one |
| POST | `/api/candidates/bulk` | JSON array import |
| POST | `/api/candidates/upload/csv` | CSV/Excel upload |
| POST | `/api/candidates/upload/pdf` | **AI** — PDF resume parsing (up to 20) |
| GET | `/api/candidates/stats` | Source breakdown, top skills |

### Screening
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/screening/run` | **AI** — run full screening pipeline |
| GET | `/api/screening` | List results |
| GET | `/api/screening/:id` | Full result with all insights |
| GET | `/api/screening/job/:jobId/latest` | Latest result for a job |
| GET | `/api/screening/:resultId/why/:email` | "Why not selected" for one candidate |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Global stats, skill demand, gaps |
| GET | `/api/analytics/job/:jobId` | Per-job score trends |

---

## Scoring System

### Default Weights (customizable per job)
| Dimension | Default Weight | What it measures |
|-----------|---------------|-----------------|
| Skills Match | 35% | Technical skills vs required skills |
| Experience | 30% | Relevance, depth, progression |
| Education | 15% | Degree level, field, certifications |
| Projects | 15% | Portfolio strength, tech alignment |
| Availability | 5% | Employment type, start date |

### Score Interpretation
| Score | Recommendation |
|-------|---------------|
| 80-100 | Strongly Recommended |
| 65-79 | Recommended |
| 50-64 | Consider |
| 0-49 | Not Recommended |

---

## Assumptions & Limitations

- **Gemini token limits**: Candidates are batched at 25/request. For 50+ candidates, multiple requests are made and results re-ranked.
- **Skill matching**: Uses normalized string comparison (handles React vs React.js). Fuzzy matching is approximate.
- **Confidence scores**: Low confidence (<65%) indicates sparse profiles — recruiter should apply more weight to own judgment.
- **Bias detection**: Flags potential language issues in AI output, but is not a guarantee of bias-free decisions. Always have human review.
- **PDF parsing**: Quality depends on PDF text extractability. Scanned image PDFs will have degraded results.
- **No live data**: Scoring is based on profile data only — no verification of claimed experience.

---

## Demo Talking Points

> "This system isn't just ranking candidates — it simulates how expert recruiters think. Every score has a reason. Every rejection has an explanation. Every candidate gets treated fairly, with bias detection built in."

**Show the judges:**
1. Create a job with AI enhancement — watch it auto-extract requirements
2. Upload the sample JSON candidates
3. Run screening — show the live progress steps
4. Open a result — explain confidence scores and bias detection
5. Expand "Why Not Selected" — show constructive rejection explanations
6. Navigate to Analytics — show the 5 charts

---

## License

MIT
