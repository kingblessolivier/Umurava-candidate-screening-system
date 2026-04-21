import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import {
  Job, TalentProfile, CandidateScore, RejectedCandidate,
  ScreeningResult, PreprocessedCandidate, AggregateInsights,
} from "../types";
import { rateLimitService } from "./rateLimitService";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ─── System Instruction (set once, applies to all calls) ──────────────────────
const RECRUITER_SYSTEM_INSTRUCTION = `You are an expert AI recruiter co-pilot built for a leading talent acquisition platform.
Your responsibilities:
- Evaluate candidates objectively using only data present in their profiles — never invent or assume skills
- Provide evidence-based, transparent assessments that human recruiters can audit and act on
- Flag your own potential biases when detected (gender language, age markers, institution prestige)
- Be honest about weak candidates — inflating scores harms hiring quality
- Return ONLY valid JSON matching the exact schema requested — no markdown, no commentary outside JSON
- Use structured scoring weights provided per job — do not override them

You are assisting humans, not replacing them. Your outputs inform decisions; they do not make them.`;

// ─── Safety settings: allow professional HR content ───────────────────────────
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE      },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ─── Client factory ───────────────────────────────────────────────────────────
function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenAI({ apiKey: key });
}

// ─── Core generation wrapper ───────────────────────────────────────────────────
interface GenerateOptions {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number; // 0 = off, >0 = reasoning tokens
}

async function generate(opts: GenerateOptions): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: opts.prompt,
    config: {
      systemInstruction: RECRUITER_SYSTEM_INSTRUCTION,
      temperature:      opts.temperature      ?? 0.2,
      topP:             0.8,
      maxOutputTokens:  opts.maxOutputTokens  ?? 8192,
      responseMimeType: "application/json",
      thinkingConfig:   { thinkingBudget: opts.thinkingBudget ?? 0 },
      safetySettings:   SAFETY_SETTINGS,
    },
  });
  return response.text ?? "";
}

// ─── Safe JSON parse ──────────────────────────────────────────────────────────
function safeJSON<T>(text: string, fallback: T): T {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(fenced ? fenced[1].trim() : text.trim()) as T;
  } catch {
    console.error("[Gemini] JSON parse failed. Raw (first 500):", text.substring(0, 500));
    return fallback;
  }
}

// ─── Rate-limited + cached generate ──────────────────────────────────────────
async function generateWithRateLimit<T>(
  cacheKey: string,
  opts: GenerateOptions,
  fallback: T
): Promise<T> {
  try {
    const raw = await rateLimitService.executeWithRateLimit(
      cacheKey,
      () => generate(opts),
      { useCache: true }
    );
    const parsed = safeJSON<T>(raw as string, fallback);
    rateLimitService.cacheResult(cacheKey, parsed);
    return parsed;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Gemini Error] ${cacheKey}: ${msg}`);
    if (msg.toLowerCase().includes("quota")) {
      console.warn(`[Quota] Returning fallback for ${cacheKey}`);
    }
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT 1 — JOB UNDERSTANDING
// ═══════════════════════════════════════════════════════════════════════════════

export async function extractJobRequirements(rawDescription: string, title: string): Promise<{
  enhancedDescription: string;
  structuredRequirements: { skill: string; level: string; yearsRequired: number; required: boolean }[];
  inferredResponsibilities: string[];
  niceToHave: string[];
  suggestedWeights: { skills: number; experience: number; education: number; projects: number; availability: number };
}> {
  const fallback = {
    enhancedDescription: rawDescription,
    structuredRequirements: [],
    inferredResponsibilities: [],
    niceToHave: [],
    suggestedWeights: { skills: 35, experience: 30, education: 15, projects: 15, availability: 5 },
  };

  const prompt = `You are a senior technical recruiter at a top-tier tech company. Analyze this job posting and extract structured hiring requirements.

JOB TITLE: ${title}

RAW JOB DESCRIPTION:
${rawDescription}

Your task:
1. Rewrite the description to be more compelling and clear (2–3 paragraphs, professional tone)
2. Extract ALL technical and soft skill requirements with proficiency levels
3. Identify 5–8 key responsibilities from the description
4. Identify nice-to-have skills (not mandatory)
5. Recommend scoring weights that make sense for THIS specific role (must sum to 100)

RULES:
- Be specific about skill levels: Beginner/Intermediate/Advanced/Expert
- For "Senior" roles: weight experience more heavily
- For "Junior" roles: weight education and potential more
- Extract only skills explicitly mentioned or strongly implied
- Do NOT invent skills that aren't relevant

Return ONLY this JSON structure:
{
  "enhancedDescription": "Professional rewrite of job description",
  "structuredRequirements": [
    { "skill": "React", "level": "Advanced", "yearsRequired": 3, "required": true },
    { "skill": "TypeScript", "level": "Intermediate", "yearsRequired": 2, "required": true }
  ],
  "inferredResponsibilities": [
    "Design and build scalable frontend components",
    "Collaborate with product and design teams"
  ],
  "niceToHave": ["GraphQL", "AWS", "Testing frameworks"],
  "suggestedWeights": {
    "skills": 35,
    "experience": 30,
    "education": 15,
    "projects": 15,
    "availability": 5
  }
}`;

  return generateWithRateLimit(
    `job-enhance:${title.toLowerCase().replace(/\s+/g, "-")}`,
    { prompt, temperature: 0.3, maxOutputTokens: 4096, thinkingBudget: 512 },
    fallback
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT 2 — MULTI-CANDIDATE EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

function buildEvaluationPrompt(job: Job, batch: PreprocessedCandidate[]): string {
  const requiredSkills = job.requirements.filter(r => r.required).map(r =>
    `${r.skill}${r.level ? ` (${r.level})` : ""}${r.yearsRequired ? `, ${r.yearsRequired}+ yrs` : ""}`
  ).join(", ");

  const niceToHave = job.niceToHave?.join(", ") || "None specified";

  const jobContext = `
━━━ JOB CONTEXT ━━━
Title: ${job.title}
Level: ${job.experienceLevel} | Type: ${job.type} | Location: ${job.location}
${job.department ? `Department: ${job.department}` : ""}

Description:
${job.description}

Required Skills: ${requiredSkills}
Nice-to-Have: ${niceToHave}

Key Responsibilities:
${job.responsibilities.map((r, i) => `  ${i + 1}. ${r}`).join("\n")}

Scoring Weights (use EXACTLY these percentages):
- Skills Match:   ${job.weights.skills}%
- Experience:     ${job.weights.experience}%
- Education:      ${job.weights.education}%
- Projects:       ${job.weights.projects}%
- Availability:   ${job.weights.availability}%
`;

  const candidateProfiles = batch.map((c, idx) => `
━━━ CANDIDATE ${idx + 1} ━━━
ID: ${c.candidateId}
Name: ${c.candidateName}
Email: ${c.email}
Total Experience: ${c.totalExperienceYears.toFixed(1)} years (${c.totalExperienceMonths} months)
Location: ${c.originalProfile.location}
Availability: ${c.originalProfile.availability.status} (${c.originalProfile.availability.type})${c.originalProfile.availability.noticePeriod ? `, Notice: ${c.originalProfile.availability.noticePeriod}` : ""}

Skills: ${c.originalProfile.skills.map(s => `${s.name} [${s.level}, ${s.yearsOfExperience}yr]`).join(" | ")}

Pre-Analysis:
  Skills Matched: ${c.skillsMatched.join(", ") || "None"}
  Skills Missing: ${c.skillsMissing.join(", ") || "None"}
  Bonus Skills: ${c.skillsBonus.join(", ") || "None"}
  Pre-Computed Skill Match Ratio: ${(c.skillMatchRatio * 100).toFixed(0)}%

Work Experience:
${c.originalProfile.experience.map(e => {
    const start = new Date(e.startDate + "-01");
    const end = e.isCurrent ? new Date() : new Date((e.endDate || "2024-01") + "-01");
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    return `  • ${e.role} @ ${e.company} (${(months / 12).toFixed(1)} yrs | ${e.isCurrent ? "Current" : e.endDate || "Past"})
    Stack: ${e.technologies.join(", ")}
    ${e.description.substring(0, 200)}${e.description.length > 200 ? "..." : ""}`;
  }).join("\n")}

Education:
${c.originalProfile.education.map(e => `  • ${e.degree} in ${e.fieldOfStudy || "N/A"} — ${e.institution} (${e.endYear || "Ongoing"})`).join("\n")}

${c.originalProfile.certifications?.length ? `Certifications: ${c.originalProfile.certifications.map(cert => cert.name).join(", ")}` : ""}

${c.originalProfile.projects?.length ? `Projects:
${c.originalProfile.projects.slice(0, 3).map(p => `  • ${p.name}: ${p.description?.substring(0, 150) || ""}... [${p.technologies?.join(", ") || "N/A"}]`).join("\n")}` : ""}

Pre-Detected Risk Flags:
${c.riskFlags.length > 0 ? c.riskFlags.map(r => `  ⚠️  [${r.severity.toUpperCase()}] ${r.type}: ${r.detail}`).join("\n") : "  None detected"}

Bio: ${c.originalProfile.bio?.substring(0, 250) || "Not provided"}
`).join("\n\n");

  return `${jobContext}

${candidateProfiles}

━━━ EVALUATION INSTRUCTIONS ━━━

For EACH candidate:

1. SCORING (0–100 per category, weighted by job weights above):
   - skillsScore: Match of candidate's skills to required skills. Penalize missing critical skills heavily.
   - experienceScore: Relevance and depth of work experience. Consider: years, role fit, industry relevance, progression.
   - educationScore: Degree relevance, institution quality, certifications. Don't discriminate by institution name.
   - projectsScore: Portfolio strength. Real-world impact, technology alignment, complexity.
   - availabilityScore: Can they start? Right employment type? Location compatible?

2. FINAL SCORE: Calculate as weighted composite using the exact weights above.
   Formula: (skillsScore × ${job.weights.skills / 100}) + (experienceScore × ${job.weights.experience / 100}) + (educationScore × ${job.weights.education / 100}) + (projectsScore × ${job.weights.projects / 100}) + (availabilityScore × ${job.weights.availability / 100})

3. CONFIDENCE SCORE (0–100): How confident are you in this assessment?
   - 90-100: Rich profile, strong signals, clear match/mismatch
   - 70-89: Good data, minor uncertainties
   - 50-69: Incomplete profile, some guesswork required
   - Below 50: Very sparse data, low reliability

4. STRENGTHS (3–5 specific bullet points referencing actual profile data)

5. GAPS (1–4 concrete gaps relative to THIS specific job, not generic weaknesses)

6. RISKS (from pre-detected flags + your analysis):
   - "Skill without proof" = claimed skill but no project/experience using it
   - "Employment gap" = unexplained gap > 6 months
   - "Short tenure" = multiple jobs < 12 months each

7. RECOMMENDATION: Based on finalScore:
   - 80-100: "Strongly Recommended"
   - 65-79:  "Recommended"
   - 50-64:  "Consider"
   - Below 50: "Not Recommended"

8. SUMMARY: 2–3 sentence recruiter-ready narrative about this candidate

9. REASONING: Detailed paragraph explaining YOUR scoring rationale (be specific, cite profile facts)

10. INTERVIEW QUESTIONS: 3 targeted questions for this specific candidate based on their gaps/profile

11. SKILL GAP ANALYSIS: Categorize all required skills as matched/missing/bonus

12. BIAS DETECTION: Flag any language in your own assessment that could indicate:
    - Gender-coded language ("he's assertive", "nurturing")
    - Age indicators ("recent graduate", "seasoned veteran")
    - Location/institution prestige bias
    If detected, flag it and provide neutral alternative phrasing.

━━━ CRITICAL RULES ━━━
- Base ALL assessments on actual profile data — no assumptions about unstated skills
- Be honest about low-scoring candidates — inflating scores harms recruiters
- Return ALL ${batch.length} candidates evaluated (not just top ones)
- Scores must be internally consistent — rank 1 must have highest finalScore

Return ONLY this JSON (no markdown, no explanation outside JSON):
{
  "evaluations": [
    {
      "candidateId": "id",
      "candidateName": "Full Name",
      "email": "email",
      "rank": 1,
      "finalScore": 87,
      "breakdown": {
        "skillsScore": 92,
        "experienceScore": 85,
        "educationScore": 78,
        "projectsScore": 88,
        "availabilityScore": 100
      },
      "confidenceScore": 88,
      "strengths": ["Specific strength referencing profile data", "..."],
      "gaps": ["Specific gap relative to job requirements", "..."],
      "risks": ["Specific risk with evidence", "..."],
      "recommendation": "Strongly Recommended",
      "summary": "2-3 sentence recruiter narrative",
      "reasoning": "Detailed scoring rationale with specific references to profile",
      "interviewQuestions": ["Targeted question 1?", "Targeted question 2?", "Targeted question 3?"],
      "skillGapAnalysis": {
        "matched": ["React", "TypeScript"],
        "missing": ["GraphQL"],
        "bonus": ["Rust", "WebAssembly"]
      },
      "biasFlags": []
    }
  ]
}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT 3 — FINAL RANKING + WHY NOT SELECTED
// ═══════════════════════════════════════════════════════════════════════════════

function buildRankingPrompt(
  job: Job,
  allEvaluations: CandidateScore[],
  shortlistSize: number,
  lowestShortlistScore: number
): string {
  const validEvaluations = allEvaluations.filter(e => e && e.breakdown && e.finalScore !== undefined);

  if (validEvaluations.length === 0) return "No valid candidate evaluations to rank.";

  const evaluationSummary = validEvaluations
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((e, i) => `${i + 1}. ${e.candidateName} (${e.email}) — Score: ${e.finalScore} | Rec: ${e.recommendation} | Skills: ${e.breakdown?.skillsScore ?? "N/A"} | Exp: ${e.breakdown?.experienceScore ?? "N/A"}`)
    .join("\n");

  const rejected = validEvaluations
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(shortlistSize)
    .map(e => ({
      id: e.candidateId,
      name: e.candidateName,
      email: e.email,
      score: e.finalScore,
      missing: e.skillGapAnalysis?.missing || [],
      gaps: e.gaps || [],
    }));

  return `You are a senior recruiter finalizing a candidate shortlist for: ${job.title} (${job.experienceLevel})

All candidates have been evaluated. Here is the COMPLETE ranked list:
${evaluationSummary}

The top ${shortlistSize} candidates will be shortlisted. The cutoff score is approximately ${lowestShortlistScore}.

Your task: For each REJECTED candidate (rank > ${shortlistSize}), write a clear, constructive, honest "Why Not Selected" explanation.

Guidelines for rejection explanations:
- Be specific: reference actual skill gaps or score differences
- Be constructive: end with 2-3 actionable improvement suggestions
- Be respectful: professional tone, never dismissive
- Be transparent: explain HOW CLOSE they were to the cutoff

Rejected candidates to explain:
${JSON.stringify(rejected, null, 2)}

Return ONLY this JSON:
{
  "rejectedCandidates": [
    {
      "candidateId": "id",
      "candidateName": "Name",
      "email": "email",
      "finalScore": 62,
      "whyNotSelected": "Clear, honest, specific explanation referencing score gap and decisive gaps.",
      "topMissingSkills": ["skill1", "skill2"],
      "closestShortlistScore": ${lowestShortlistScore},
      "improvementSuggestions": [
        "Gain hands-on experience with [specific skill] through a portfolio project",
        "Consider earning the [specific certification] to validate your backend skills"
      ]
    }
  ]
}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESUME PARSER
// ═══════════════════════════════════════════════════════════════════════════════

export async function parseResumeToProfile(rawText: string, email?: string): Promise<Partial<TalentProfile>> {
  const fallback: Partial<TalentProfile> = {
    email: email || "",
    firstName: "",
    lastName: "",
    headline: "",
    location: "",
    skills: [],
    experience: [],
    education: [],
    availability: { status: "Available", type: "Full-time" },
  };

  const prompt = `You are an expert resume parser. Extract all information from this resume and return structured JSON.

RESUME TEXT:
${rawText.substring(0, 8000)}

Extract EVERY detail available. For missing fields, use empty string or empty array — do NOT invent data.

Return ONLY this JSON:
{
  "firstName": "",
  "lastName": "",
  "email": "${email || ""}",
  "phone": "",
  "headline": "",
  "bio": "",
  "location": "",
  "skills": [
    { "name": "React", "level": "Advanced", "yearsOfExperience": 4 }
  ],
  "experience": [
    {
      "company": "",
      "role": "",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "isCurrent": false,
      "description": "",
      "technologies": [],
      "achievements": []
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "fieldOfStudy": "",
      "startYear": 2018,
      "endYear": 2022
    }
  ],
  "certifications": [
    { "name": "", "issuer": "", "issueDate": "YYYY-MM" }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": [],
      "role": "",
      "link": "",
      "impact": ""
    }
  ],
  "availability": {
    "status": "Available",
    "type": "Full-time"
  },
  "socialLinks": {
    "linkedin": "",
    "github": "",
    "portfolio": ""
  }
}`;

  return generateWithRateLimit(
    `resume-parse:${email || Date.now()}`,
    { prompt, temperature: 0.1, maxOutputTokens: 4096, thinkingBudget: 0 },
    fallback
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREENING PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function runScreeningPipeline(
  job: Job,
  preprocessed: PreprocessedCandidate[],
  shortlistSize: number
): Promise<Omit<ScreeningResult, "_id" | "screeningDate" | "createdAt">> {
  const startTime = Date.now();
  const BATCH_SIZE = 20;

  // ── Step 1: Evaluate candidates in sequential batches ─────────────────────
  // Sequential (not parallel) to respect rate limits properly
  const batches: PreprocessedCandidate[][] = [];
  for (let i = 0; i < preprocessed.length; i += BATCH_SIZE) {
    batches.push(preprocessed.slice(i, i + BATCH_SIZE));
  }

  let allEvaluations: CandidateScore[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const cacheKey = `screening:${job._id}:batch-${batchIndex}:size-${batch.length}`;
    const prompt = buildEvaluationPrompt(job, batch);

    console.log(`[Screening] Evaluating batch ${batchIndex + 1}/${batches.length} (${batch.length} candidates)`);

    const result = await generateWithRateLimit<{ evaluations: CandidateScore[] }>(
      cacheKey,
      { prompt, temperature: 0.2, maxOutputTokens: 12288, thinkingBudget: 2048 },
      { evaluations: [] }
    );

    allEvaluations.push(...(result.evaluations || []));
  }

  if (allEvaluations.length === 0 && preprocessed.length > 0) {
    throw new Error(
      `AI screening failed — no evaluations returned from ${batches.length} batch(es). Check your Gemini API key and quota.`
    );
  }

  // ── Step 2: Re-rank combined pool if multiple batches ─────────────────────
  if (batches.length > 1 && allEvaluations.length > shortlistSize) {
    allEvaluations.sort((a, b) => b.finalScore - a.finalScore);
    const topIds = new Set(allEvaluations.slice(0, shortlistSize * 2).map(e => e.candidateId));
    const topPreprocessed = preprocessed.filter(p => topIds.has(p.candidateId));

    console.log(`[Screening] Re-ranking top ${topPreprocessed.length} candidates across batches`);

    const finalPrompt = buildEvaluationPrompt(job, topPreprocessed);
    const finalResult = await generateWithRateLimit<{ evaluations: CandidateScore[] }>(
      `screening:${job._id}:final-ranking`,
      { prompt: finalPrompt, temperature: 0.2, maxOutputTokens: 12288, thinkingBudget: 3072 },
      { evaluations: allEvaluations.slice(0, shortlistSize) }
    );
    allEvaluations = finalResult.evaluations || allEvaluations.slice(0, shortlistSize);
  }

  // ── Step 3: Sort, re-number ranks, split shortlist / rejected ─────────────
  allEvaluations = allEvaluations
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const shortlist = allEvaluations.slice(0, shortlistSize);
  const lowestShortlistScore = shortlist[shortlist.length - 1]?.finalScore ?? 0;

  // ── Step 4: Generate "Why Not Selected" explanations ──────────────────────
  let rejectedCandidates: RejectedCandidate[] = [];
  const rejectedFromEval = allEvaluations.slice(shortlistSize);

  const evaluatedIds = new Set(allEvaluations.map(e => e.candidateId));
  const neverEvaluated = preprocessed
    .filter(p => !evaluatedIds.has(p.candidateId))
    .map(p => ({
      candidateId: p.candidateId,
      candidateName: p.candidateName,
      email: p.email,
      finalScore: Math.round(
        p.rawSkillScore * 0.35 + p.rawExperienceScore * 0.30 +
        p.rawEducationScore * 0.15 + p.rawProjectScore * 0.15 + p.availabilityScore * 0.05
      ),
      gaps: [`Missing ${p.skillsMissing.length} required skills: ${p.skillsMissing.join(", ")}`],
      skillGapAnalysis: { missing: p.skillsMissing, matched: p.skillsMatched, bonus: p.skillsBonus },
    } as unknown as CandidateScore));

  const allRejected = [...rejectedFromEval, ...neverEvaluated];

  if (allRejected.length > 0 && shortlist.length > 0) {
    const rankingPrompt = buildRankingPrompt(job, allRejected, 0, lowestShortlistScore);
    const rankResult = await generateWithRateLimit<{ rejectedCandidates: RejectedCandidate[] }>(
      `screening:${job._id}:rejection-reasons`,
      { prompt: rankingPrompt, temperature: 0.3, maxOutputTokens: 8192, thinkingBudget: 1024 },
      { rejectedCandidates: [] }
    );
    rejectedCandidates = rankResult.rejectedCandidates || [];
  }

  // ── Step 5: Aggregate insights ────────────────────────────────────────────
  const aggregateInsights = computeAggregateInsights(shortlist);

  const processingTimeMs = Date.now() - startTime;
  console.log(`[Screening] Done in ${(processingTimeMs / 1000).toFixed(1)}s — ${shortlist.length} shortlisted, ${rejectedCandidates.length} rejected`);

  return {
    jobId: job._id || "",
    jobTitle: job.title,
    totalApplicants: preprocessed.length,
    shortlistSize: shortlist.length,
    shortlist,
    rejectedCandidates,
    aggregateInsights,
    aiModel: MODEL_NAME,
    processingTimeMs,
  };
}

// ─── Aggregate Insights ───────────────────────────────────────────────────────

function computeAggregateInsights(shortlist: CandidateScore[]): AggregateInsights {
  const allSkills = shortlist.flatMap(c => c.skillGapAnalysis.matched);
  const skillCounts: Record<string, { count: number; totalScore: number }> = {};
  for (const skill of allSkills) {
    if (!skillCounts[skill]) skillCounts[skill] = { count: 0, totalScore: 0 };
    skillCounts[skill].count++;
    skillCounts[skill].totalScore += shortlist.find(c => c.skillGapAnalysis.matched.includes(skill))?.finalScore || 0;
  }

  const skillDemand = Object.entries(skillCounts)
    .map(([skill, { count, totalScore }]) => ({ skill, count, avgScore: Math.round(totalScore / count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const missingCounts: Record<string, number> = {};
  for (const c of shortlist) {
    for (const skill of c.skillGapAnalysis.missing) {
      missingCounts[skill] = (missingCounts[skill] || 0) + 1;
    }
  }
  const commonGaps = Object.entries(missingCounts)
    .map(([skill, missingCount]) => ({ skill, missingCount }))
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, 10);

  const scores = shortlist.map(c => c.finalScore);
  const scoreDistribution = [
    { range: "90-100", count: scores.filter(s => s >= 90).length },
    { range: "80-89",  count: scores.filter(s => s >= 80 && s < 90).length },
    { range: "70-79",  count: scores.filter(s => s >= 70 && s < 80).length },
    { range: "60-69",  count: scores.filter(s => s >= 60 && s < 70).length },
    { range: "50-59",  count: scores.filter(s => s >= 50 && s < 60).length },
    { range: "0-49",   count: scores.filter(s => s < 50).length },
  ];

  const avgScoreByCategory: AggregateInsights["avgScoreByCategory"] = {
    skillsScore:       avg(shortlist.map(c => c.breakdown.skillsScore)),
    experienceScore:   avg(shortlist.map(c => c.breakdown.experienceScore)),
    educationScore:    avg(shortlist.map(c => c.breakdown.educationScore)),
    projectsScore:     avg(shortlist.map(c => c.breakdown.projectsScore)),
    availabilityScore: avg(shortlist.map(c => c.breakdown.availabilityScore)),
  };

  const recBreakdown: Record<string, number> = {};
  for (const c of shortlist) {
    recBreakdown[c.recommendation] = (recBreakdown[c.recommendation] || 0) + 1;
  }

  return {
    skillDemand,
    commonGaps,
    scoreDistribution,
    avgScoreByCategory,
    topCandidateScore: Math.max(...scores, 0),
    avgCandidateScore: avg(scores),
    recommendationBreakdown: recBreakdown,
  };
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
