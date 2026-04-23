export interface Skill {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsOfExperience: number;
}

export interface WorkExperience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  technologies: string[];
  achievements?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear?: number;
  endYear?: number;
  gpa?: number;
}

export interface Certification {
  name: string;
  issuer?: string;
  issueDate?: string;
}

export interface Language {
  name: string;
  proficiency: "Basic" | "Conversational" | "Fluent" | "Native";
}

export interface Project {
  name: string;
  description?: string;
  technologies: string[];
  role?: string;
  link?: string;
  startDate?: string;
  endDate?: string;
  impact?: string;
}

export interface Candidate {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  headline: string;
  bio?: string;
  location: string;
  jobId: string;
  skills: Skill[];
  languages?: Language[];
  experience: WorkExperience[];
  education: Education[];
  certifications?: Certification[];
  projects?: Project[];
  availability: {
    status: "Available" | "Open to Opportunities" | "Not Available";
    type: "Full-time" | "Part-time" | "Contract" | "Freelance";
    startDate?: string;
    noticePeriod?: string;
  };
  socialLinks?: { linkedin?: string; github?: string; portfolio?: string };
  source?: "platform" | "csv" | "pdf" | "json";
  createdAt: string;
}

export interface JobRequirement {
  skill: string;
  level?: string;
  yearsRequired?: number;
  required: boolean;
}

export interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
  projects: number;
  availability: number;
}

export interface Job {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface BiasFlag {
  type: string;
  signal: string;
  recommendation: string;
}

export interface RiskFlag {
  type: string;
  detail: string;
  severity: "low" | "medium" | "high";
}

export interface CandidateScore {
  candidateId: string;
  candidateName: string;
  email: string;
  rank: number;
  finalScore: number;
  breakdown: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    projectsScore: number;
    availabilityScore: number;
  };
  confidenceScore: number;
  strengths: string[];
  gaps: string[];
  risks: string[];
  recommendation: "Strongly Recommended" | "Recommended" | "Consider" | "Not Recommended";
  summary: string;
  reasoning: string;
  interviewQuestions: string[];
  skillGapAnalysis: {
    matched: string[];
    missing: string[];
    bonus: string[];
  };
  biasFlags: BiasFlag[];
  riskFlags: RiskFlag[];
}

export interface RejectedCandidate {
  candidateId: string;
  candidateName: string;
  email: string;
  finalScore: number;
  whyNotSelected: string;
  topMissingSkills: string[];
  closestShortlistScore: number;
  improvementSuggestions: string[];
}

export interface AggregateInsights {
  skillDemand: { skill: string; count: number; avgScore: number }[];
  commonGaps: { skill: string; missingCount: number }[];
  scoreDistribution: { range: string; count: number }[];
  avgScoreByCategory: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    projectsScore: number;
    availabilityScore: number;
  };
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
}

export interface ScreeningResult {
  _id: string;
  jobId: string;
  jobTitle: string;
  totalApplicants: number;
  shortlistSize: number;
  shortlist: CandidateScore[];
  rejectedCandidates: RejectedCandidate[];
  aggregateInsights: AggregateInsights;
  screeningDate: string;
  aiModel: string;
  processingTimeMs: number;
  createdAt: string;
  thinkingLog?: ThinkingSnapshot[];
}

export interface DashboardStats {
  overview: {
    totalJobs: number;
    activeJobs: number;
    totalCandidates: number;
    totalScreenings: number;
  };
  scoreStats: {
    avgScore: number;
    maxScore: number;
    totalRanked: number;
    avgConfidence: number;
  };
  recentScreenings: Partial<ScreeningResult>[];
  topSkills: { skill: string; count: number; avgScore: number }[];
  commonGaps: { skill: string; count: number }[];
  recBreakdown: Record<string, number>;
  candidateSources: { source: string; count: number }[];
}
