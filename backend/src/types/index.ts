// ─── Skill Level Numeric Map ──────────────────────────────────────────────────
export const SKILL_LEVEL_SCORE: Record<string, number> = {
  Beginner: 25,
  Intermediate: 55,
  Advanced: 80,
  Expert: 100,
};

// ─── Talent Profile Schema (Umurava Spec) ─────────────────────────────────────

export interface Skill {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsOfExperience: number;
}

export interface Language {
  name: string;
  proficiency: "Basic" | "Conversational" | "Fluent" | "Native";
}

export interface WorkExperience {
  company: string;
  role: string;
  startDate: string;   // YYYY-MM
  endDate?: string;    // YYYY-MM | omitted if current
  isCurrent: boolean;
  description: string;
  technologies: string[];
  achievements?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear?: number;
  gpa?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string; // YYYY-MM
  expiryDate?: string;
  credentialUrl?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  link?: string;
  startDate?: string;
  endDate?: string;
  impact?: string;
}

export interface Availability {
  status: "Available" | "Open to Opportunities" | "Not Available";
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  noticePeriod?: string;
  preferredStartDate?: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
}

export interface TalentProfile {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  headline: string;
  bio?: string;
  location: string;
  jobId: string;  // Required: Job the candidate is applying to
  skills: Skill[];
  languages?: Language[];
  experience: WorkExperience[];
  education: Education[];
  certifications?: Certification[];
  projects?: Project[];
  availability: Availability;
  socialLinks?: SocialLinks;
  source?: "platform" | "csv" | "pdf" | "json";
  parsedResumeText?: string;
  createdAt?: Date;
}

// ─── Job Schema ───────────────────────────────────────────────────────────────

export interface JobRequirement {
  skill: string;
  level?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsRequired?: number;
  required: boolean;
}

export interface ScoringWeights {
  skills: number;        // default 35
  experience: number;    // default 30
  education: number;     // default 15
  projects: number;      // default 15
  availability: number;  // default 5
}

export interface Job {
  _id?: string;
  title: string;
  description: string;
  department?: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  experienceLevel: "Junior" | "Mid-level" | "Senior" | "Lead" | "Executive";
  requirements: JobRequirement[];
  niceToHave?: string[];
  responsibilities: string[];
  salaryRange?: { min: number; max: number; currency: string };
  weights: ScoringWeights;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Preprocessing Signals ────────────────────────────────────────────────────

export interface PreprocessedCandidate {
  candidateId: string;
  candidateName: string;
  email: string;
  // Computed signals
  totalExperienceMonths: number;
  totalExperienceYears: number;
  skillsMatched: string[];
  skillsMissing: string[];
  skillsBonus: string[];
  skillMatchRatio: number;          // 0–1
  rawSkillScore: number;            // 0–100 pre-Gemini
  rawExperienceScore: number;
  rawEducationScore: number;
  rawProjectScore: number;
  availabilityScore: number;
  riskFlags: RiskFlag[];
  originalProfile: TalentProfile;
}

export interface RiskFlag {
  type: "SKILL_UNVERIFIED" | "SHORT_TENURE" | "EMPLOYMENT_GAP" | "MISSING_CRITICAL_SKILL" | "OVERQUALIFIED" | "LOCATION_MISMATCH";
  detail: string;
  severity: "low" | "medium" | "high";
}

// ─── AI Scoring Output ────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  projectsScore: number;
  availabilityScore: number;
}

export interface SkillGapAnalysis {
  matched: string[];
  missing: string[];
  bonus: string[];
}

export interface BiasFlag {
  type: "GENDER_LANGUAGE" | "AGE_INDICATOR" | "LOCATION_BIAS" | "INSTITUTION_PRESTIGE_BIAS" | "NAME_BIAS";
  signal: string;
  recommendation: string;
}

export interface CandidateScore {
  candidateId: string;
  candidateName: string;
  email: string;
  rank: number;
  finalScore: number;              // Weighted composite 0–100
  breakdown: ScoreBreakdown;
  confidenceScore: number;         // 0–100: AI certainty about this assessment
  strengths: string[];
  gaps: string[];
  risks: string[];
  recommendation: "Strongly Recommended" | "Recommended" | "Consider" | "Not Recommended";
  summary: string;                 // 2–3 sentence recruiter-ready summary
  reasoning: string;               // Detailed AI reasoning
  interviewQuestions: string[];
  skillGapAnalysis: SkillGapAnalysis;
  biasFlags: BiasFlag[];
  riskFlags: RiskFlag[];
}

export interface RejectedCandidate {
  candidateId: string;
  candidateName: string;
  email: string;
  finalScore: number;
  rank: number;                    // Overall rank among all candidates
  breakdown: ScoreBreakdown;
  confidenceScore: number;
  strengths: string[];
  gaps: string[];
  risks: string[];
  recommendation: "Strongly Recommended" | "Recommended" | "Consider" | "Not Recommended";
  summary: string;
  reasoning: string;
  interviewQuestions: string[];
  skillGapAnalysis: SkillGapAnalysis;
  biasFlags: BiasFlag[];
  riskFlags: RiskFlag[];
  scoreGap: number;                // Points below the cutoff score
  whyNotSelected: string;          // Honest, specific, candidate-readable explanation
  topMissingSkills: string[];
  closestShortlistScore: number;   // Score of the last shortlisted candidate
  improvementSuggestions: string[];
}

export interface AggregateInsights {
  skillDemand: { skill: string; count: number; avgScore: number }[];
  commonGaps: { skill: string; missingCount: number }[];
  scoreDistribution: { range: string; count: number }[];
  avgScoreByCategory: ScoreBreakdown;
  topCandidateScore: number;
  avgCandidateScore: number;
  recommendationBreakdown: Record<string, number>;
}

export interface ThinkingSnapshot {
  stage: 'evaluating' | 'reranking' | 'rejection';
  batchIndex: number;
  batchLabel: string;
  candidateNames: string[];
  thinking: string;
  timestamp: string;
  snapshotId?: string;
  isFinal?: boolean;
}

export interface ScreeningResult {
  _id?: string;
  jobId: string;
  jobTitle: string;
  totalApplicants: number;
  shortlistSize: number;
  shortlist: CandidateScore[];
  rejectedCandidates: RejectedCandidate[];
  aggregateInsights: AggregateInsights;
  screeningDate: Date;
  aiModel: string;
  processingTimeMs: number;
  createdAt?: Date;
  thinkingLog?: ThinkingSnapshot[];
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
}

// Express request extension
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
