import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import {
  Job, TalentProfile, CandidateScore, RejectedCandidate,
  ScreeningResult, PreprocessedCandidate, AggregateInsights, ThinkingSnapshot,
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
  onThinking?: (thinking: string) => void; // fires with raw thinking tokens when available
}

async function generate(opts: GenerateOptions): Promise<string> {
  const ai = getClient();
  const budget = opts.thinkingBudget ?? 0;
  const useThinking = budget > 0;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: opts.prompt,
    config: {
      systemInstruction: RECRUITER_SYSTEM_INSTRUCTION,
      // gemini-2.5-flash only supports temperature=1 when thinking is enabled.
      // Sending any other value causes a 400 that silently becomes empty evaluations.
      temperature:     useThinking ? 1 : (opts.temperature ?? 0.2),
      // topP is not compatible with thinking mode on gemini-2.5
      ...(useThinking ? {} : { topP: 0.8 }),
      maxOutputTokens:  opts.maxOutputTokens  ?? 8192,
      responseMimeType: "application/json",
      // Only include thinkingConfig when actually using thinking
      ...(useThinking ? { thinkingConfig: { thinkingBudget: budget } } : {}),
      safetySettings:   SAFETY_SETTINGS,
    },
  });

  // Extract and surface thinking tokens when thinking mode is active
  if (useThinking && opts.onThinking) {
    const parts = (response.candidates?.[0]?.content?.parts ?? []) as Array<{ thought?: boolean; text?: string }>;
    const thinkingText = parts
      .filter(p => p.thought === true)
      .map(p => p.text ?? "")
      .join("\n\n")
      .trim();
    if (thinkingText) opts.onThinking(thinkingText);
  }

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
  fallback: T,
  { useCache = true }: { useCache?: boolean } = {}
): Promise<T> {
  try {
    const raw = await rateLimitService.executeWithRateLimit(
      cacheKey,
      () => generate(opts),
      { useCache }
    );
    const parsed = safeJSON<T>(raw as string, fallback);
    if (useCache) rateLimitService.cacheResult(cacheKey, parsed);
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

  // Limit to 12 000 chars — covers most dense resumes without bloating the prompt
  const resumeSnippet = rawText.substring(0, 12000);

  const prompt = `You are an expert resume parser. Your job is to extract every piece of structured information from the resume text below and return it as a single JSON object.

═══ RESUME TEXT ═══
${resumeSnippet}
═══ END RESUME ═══

${email ? `Known email from document metadata: ${email}` : ""}

━━━ EXTRACTION RULES ━━━

NAMES
- Split the full name into firstName and lastName.
- If only one name token exists, put it in firstName and leave lastName empty.

EMAIL
- Prefer the email found in the resume body over the metadata hint.
- If none found in the body, use the metadata email: "${email || ""}".

HEADLINE
- Synthesize a 1-line professional headline (e.g. "Senior Backend Engineer · Node.js & AWS") from the candidate's most recent role and strongest skills.
- If the resume already has a summary/headline line, use that verbatim (keep it under 120 chars).

SKILLS — LEVEL INFERENCE RULES (apply consistently):
- "Expert"       : 7+ years OR described as "expert / principal / architect" OR led teams with that skill
- "Advanced"     : 4–6 years OR "senior / lead" context OR strong project evidence
- "Intermediate" : 2–3 years OR mentioned as primary stack without explicit senior context
- "Beginner"     : < 2 years OR listed as "familiar with / exposure to / learning"
- Default to "Intermediate" when no evidence exists.
- yearsOfExperience: best estimate from the work timeline; use 1 when uncertain.
- Include ALL technologies, frameworks, languages, tools, platforms, methodologies mentioned anywhere in the resume.

DATES — NORMALIZATION RULES:
- Convert all dates to "YYYY-MM" format.
  Examples: "January 2020" → "2020-01", "Jan 2020" → "2020-01", "Q1 2019" → "2019-01", "2019" → "2019-01".
- For ongoing roles ("Present", "Current", "Now", "—"): set isCurrent=true and endDate="".
- If only a year is given for education (e.g. "Graduated 2022"), use that year as endYear.

EXPERIENCE
- Extract every job entry, including internships, freelance, and volunteer work.
- description: concise 1–3 sentence summary of what they did and achieved.
- technologies: every tool/language/framework mentioned for that role.
- achievements: specific measurable outcomes if stated (e.g. "Reduced latency by 40%").

EDUCATION
- Include all degrees, diplomas, bootcamps, online programs.
- For ongoing programs, leave endYear as null or the expected graduation year.

PROJECTS
- Extract personal projects, open-source contributions, academic projects.
- technologies: list all tech used.
- link: GitHub URL, live URL, or portfolio link if mentioned.

AVAILABILITY
- status: "Available" unless the resume explicitly says they are employed with no intention to move — then use "Open to Opportunities".
- type: infer from resume context. If contract/freelance history dominates, use "Contract". Default "Full-time".

SOCIAL LINKS — extract any URLs mentioning:
- linkedin.com → socialLinks.linkedin
- github.com   → socialLinks.github
- Any portfolio/personal site → socialLinks.portfolio

IMPORTANT:
- Return ONLY the JSON object below — no markdown fences, no extra commentary.
- For any field where information is genuinely absent, use "" (string), [] (array), or null (number) — do NOT invent data.
- Do NOT include empty objects in arrays (e.g. no \`{}\` entries in skills/experience/education).

{
  "firstName": "",
  "lastName": "",
  "email": "",
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
      "technologies": ["TypeScript", "Node.js"],
      "achievements": ["Reduced API latency by 35%"]
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
    `resume-parse:${Date.now()}-${Math.random().toString(36).slice(2)}`,
    { prompt, temperature: 0.1, maxOutputTokens: 6144, thinkingBudget: 512 },
    fallback,
    { useCache: false }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREENING PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScreeningProgressEvent {
  type: 'analyzing' | 'scoring' | 'flagging' | 'generating' | 'evaluating' | 'thinking' | 'completed';
  message: string;
  candidateName?: string;
  detail?: string;
  liveScores?: { skills: number; experience: number; education: number; projects: number; availability: number };
  partialShortlist?: CandidateScore[];
  evaluatedCount?: number;
  thinkingSnapshot?: ThinkingSnapshot; // real Gemini thinking tokens for this step
}

export type ScreeningProgressFn = (event: ScreeningProgressEvent) => void;

function computePartialLiveScores(
  evaluations: CandidateScore[]
): ScreeningProgressEvent["liveScores"] {
  if (evaluations.length === 0) return undefined;
  return {
    skills:       avg(evaluations.map(e => e.breakdown.skillsScore)),
    experience:   avg(evaluations.map(e => e.breakdown.experienceScore)),
    education:    avg(evaluations.map(e => e.breakdown.educationScore)),
    projects:     avg(evaluations.map(e => e.breakdown.projectsScore)),
    availability: avg(evaluations.map(e => e.breakdown.availabilityScore)),
  };
}

export async function runScreeningPipeline(
  job: Job,
  preprocessed: PreprocessedCandidate[],
  shortlistSize: number,
  onProgress?: ScreeningProgressFn
): Promise<Omit<ScreeningResult, "_id" | "screeningDate" | "createdAt">> {
  const startTime = Date.now();
  const BATCH_SIZE = 20;
  const thinkingLog: ThinkingSnapshot[] = [];

  onProgress?.({
    type: "analyzing",
    message: `Analyzing ${preprocessed.length} candidate${preprocessed.length !== 1 ? "s" : ""} for "${job.title}"…`,
    evaluatedCount: 0,
  });

  // ── Step 1: Evaluate candidates in sequential batches ─────────────────────
  const batches: PreprocessedCandidate[][] = [];
  for (let i = 0; i < preprocessed.length; i += BATCH_SIZE) {
    batches.push(preprocessed.slice(i, i + BATCH_SIZE));
  }

  let allEvaluations: CandidateScore[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const cacheKey = `screening:${job._id}:batch-${batchIndex}:size-${batch.length}`;
    const prompt = buildEvaluationPrompt(job, batch);

    const previewNames = batch.slice(0, 4).map(c => c.candidateName.split(" ")[0]).join(", ");
    const suffix = batch.length > 4 ? ` +${batch.length - 4} more` : "";
    onProgress?.({
      type: "evaluating",
      message: `Evaluating batch ${batchIndex + 1} of ${batches.length}: ${previewNames}${suffix}`,
      evaluatedCount: allEvaluations.length,
    });

    console.log(`[Screening] Evaluating batch ${batchIndex + 1}/${batches.length} (${batch.length} candidates)`);

    // Capture real Gemini thinking tokens and surface them via SSE
    const onThinking = (thinking: string) => {
      const snapshot: ThinkingSnapshot = {
        stage: "evaluating",
        batchIndex,
        batchLabel: `Batch ${batchIndex + 1} of ${batches.length}`,
        candidateNames: batch.map(c => c.candidateName),
        thinking,
        timestamp: new Date().toISOString(),
      };
      thinkingLog.push(snapshot);
      onProgress?.({
        type: "thinking",
        message: `AI reasoning complete — batch ${batchIndex + 1}`,
        evaluatedCount: allEvaluations.length,
        thinkingSnapshot: snapshot,
      });
    };

    const result = await generateWithRateLimit<{ evaluations: CandidateScore[] }>(
      cacheKey,
      { prompt, temperature: 0.2, maxOutputTokens: 12288, thinkingBudget: 2048, onThinking },
      { evaluations: [] }
    );

    allEvaluations.push(...(result.evaluations || []));

    const partialSorted = [...allEvaluations]
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5);
    onProgress?.({
      type: "scoring",
      message: `Batch ${batchIndex + 1} scored — ${allEvaluations.length}/${preprocessed.length} candidates evaluated`,
      liveScores: computePartialLiveScores(allEvaluations),
      partialShortlist: partialSorted,
      evaluatedCount: allEvaluations.length,
    });
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

    onProgress?.({
      type: "analyzing",
      message: `Re-ranking top ${topPreprocessed.length} candidates across all batches…`,
      evaluatedCount: allEvaluations.length,
    });

    const rerankOnThinking = (thinking: string) => {
      const snapshot: ThinkingSnapshot = {
        stage: "reranking",
        batchIndex: batches.length,
        batchLabel: `Final Re-ranking — Top ${topPreprocessed.length}`,
        candidateNames: topPreprocessed.map(c => c.candidateName),
        thinking,
        timestamp: new Date().toISOString(),
      };
      thinkingLog.push(snapshot);
      onProgress?.({
        type: "thinking",
        message: "AI re-ranking reasoning complete",
        evaluatedCount: allEvaluations.length,
        thinkingSnapshot: snapshot,
      });
    };

    const finalPrompt = buildEvaluationPrompt(job, topPreprocessed);
    const finalResult = await generateWithRateLimit<{ evaluations: CandidateScore[] }>(
      `screening:${job._id}:final-ranking`,
      { prompt: finalPrompt, temperature: 0.2, maxOutputTokens: 12288, thinkingBudget: 3072, onThinking: rerankOnThinking },
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
    onProgress?.({
      type: "generating",
      message: `Generating feedback for ${allRejected.length} candidate${allRejected.length !== 1 ? "s" : ""} not shortlisted…`,
      evaluatedCount: preprocessed.length,
    });

    const rejectionOnThinking = (thinking: string) => {
      const snapshot: ThinkingSnapshot = {
        stage: "rejection",
        batchIndex: batches.length + 1,
        batchLabel: "Rejection Feedback Generation",
        candidateNames: allRejected.map(c => c.candidateName),
        thinking,
        timestamp: new Date().toISOString(),
      };
      thinkingLog.push(snapshot);
      onProgress?.({
        type: "thinking",
        message: "AI rejection reasoning complete",
        evaluatedCount: preprocessed.length,
        thinkingSnapshot: snapshot,
      });
    };

    const rankingPrompt = buildRankingPrompt(job, allRejected, 0, lowestShortlistScore);
    const rankResult = await generateWithRateLimit<{ rejectedCandidates: RejectedCandidate[] }>(
      `screening:${job._id}:rejection-reasons`,
      { prompt: rankingPrompt, temperature: 0.3, maxOutputTokens: 8192, thinkingBudget: 1024, onThinking: rejectionOnThinking },
      { rejectedCandidates: [] }
    );
    rejectedCandidates = rankResult.rejectedCandidates || [];
  }

  // ── Step 5: Aggregate insights ────────────────────────────────────────────
  const aggregateInsights = computeAggregateInsights(shortlist);

  const processingTimeMs = Date.now() - startTime;
  console.log(`[Screening] Done in ${(processingTimeMs / 1000).toFixed(1)}s — ${shortlist.length} shortlisted, ${rejectedCandidates.length} rejected, ${thinkingLog.length} thinking snapshot(s)`);

  onProgress?.({
    type: "completed",
    message: `Screening complete — ${shortlist.length} candidates shortlisted from ${preprocessed.length} applicants`,
    liveScores: computePartialLiveScores(shortlist),
    partialShortlist: shortlist.slice(0, 5),
    evaluatedCount: preprocessed.length,
  });

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
    thinkingLog,
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
