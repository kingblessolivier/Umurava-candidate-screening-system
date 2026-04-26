import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import {
  Job, TalentProfile, CandidateScore, RejectedCandidate,
  ScreeningResult, PreprocessedCandidate, AggregateInsights, ThinkingSnapshot,
} from "../types";
import { rateLimitService } from "./rateLimitService";

const SCREENING_MODEL = (process.env.SCREENING_MODEL || process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview").trim();
const RESUME_PARSER_MODEL = (process.env.RESUME_PARSER_MODEL || process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview").trim();
const SCREENING_THINKING_BUDGET = parseInt(process.env.SCREENING_THINKING_BUDGET || "0", 10);
const SCREENING_BATCH_SIZE = parseInt(process.env.SCREENING_BATCH_SIZE || "10", 10);
const SCREENING_FALLBACK_MODELS = (process.env.SCREENING_FALLBACK_MODELS || "")
  .split(",").map((m) => m.trim()).filter(Boolean);
const RESUME_PARSER_FALLBACK_MODELS = (process.env.RESUME_PARSER_FALLBACK_MODELS || "")
  .split(",").map((m) => m.trim()).filter(Boolean);
// Default to AI-generated rejection reasons (Option B). Set USE_AI_REJECTION_REASONS=false
// only if you explicitly want a single generic message for all rejected candidates.
const USE_AI_REJECTION_REASONS = (process.env.USE_AI_REJECTION_REASONS || "true").toLowerCase() === "true";
const GENERIC_REJECTION_MESSAGE =
  process.env.GENERIC_REJECTION_MESSAGE ||
  "Thank you for your application. After review, you were not selected for this shortlist. This decision is based on overall fit and the current hiring threshold for the role.";

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
  model?: string; // defaults to DEFAULT_SCREENING_MODEL
  temperature?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number; // 0 = off, >0 = reasoning tokens
  onThinking?: (thinking: string, isFinal?: boolean) => void; // fires with raw thinking tokens when available
}

function mergeIncrementalText(previous: string, incoming: string): string {
  if (!incoming) return previous;
  if (!previous) return incoming;
  if (incoming.startsWith(previous)) return incoming;
  if (previous.endsWith(incoming)) return previous;
  return `${previous}${incoming}`;
}

function extractBalancedJson(text: string): string | null {
  const firstObject = text.search(/[\[{]/);
  if (firstObject < 0) return null;

  const source = text.slice(firstObject);
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push(char);
      continue;
    }

    if (char === '}' || char === ']') {
      const open = stack.pop();
      const isMatch = (open === '{' && char === '}') || (open === '[' && char === ']');
      if (!isMatch) return null;
      if (stack.length === 0) {
        return source.slice(0, i + 1);
      }
    }
  }

  return null;
}

async function generate(opts: GenerateOptions): Promise<string> {
  const ai = getClient();
  const model = opts.model ?? SCREENING_MODEL;
  const budget = opts.thinkingBudget ?? 0;
  const useThinking = budget > 0;

  const config = {
    systemInstruction: RECRUITER_SYSTEM_INSTRUCTION,
    // gemini-2.5-flash only supports temperature=1 when thinking is enabled.
    // Sending any other value causes a 400 that silently becomes empty evaluations.
    temperature: useThinking ? 1 : (opts.temperature ?? 0.2),
    // topP is not compatible with thinking mode on gemini-2.5
    ...(useThinking ? {} : { topP: 0.8 }),
    maxOutputTokens: opts.maxOutputTokens ?? 8192,
    responseMimeType: "application/json" as const,
    // Only include thinkingConfig when actually using thinking
    ...(useThinking ? { thinkingConfig: { thinkingBudget: budget } } : {}),
    safetySettings: SAFETY_SETTINGS,
  };

  // Stream when thinking is enabled so frontend can render incremental reasoning.
  if (useThinking && opts.onThinking) {
    const stream = await ai.models.generateContentStream({
      model,
      contents: opts.prompt,
      config,
    });

    let thinkingText = "";
    let outputText = "";
    let lastPublishedLength = 0;

    for await (const chunk of stream) {
      const parts = (chunk.candidates?.[0]?.content?.parts ?? []) as Array<{ thought?: boolean; text?: string }>;

      for (const part of parts) {
        const text = part.text ?? "";
        if (!text) continue;
        if (part.thought === true) {
          thinkingText = mergeIncrementalText(thinkingText, text);
        } else {
          outputText = mergeIncrementalText(outputText, text);
        }
      }

      if (thinkingText.length > lastPublishedLength) {
        opts.onThinking(thinkingText.trim(), false);
        lastPublishedLength = thinkingText.length;
      }
    }

    if (thinkingText.trim()) {
      opts.onThinking(thinkingText.trim(), true);
    }

    return outputText.trim();
  }

  const response = await ai.models.generateContent({
    model,
    contents: opts.prompt,
    config,
  });

  // Extract and surface thinking tokens when thinking mode is active
  if (useThinking && opts.onThinking) {
    const parts = (response.candidates?.[0]?.content?.parts ?? []) as Array<{ thought?: boolean; text?: string }>;
    const thinkingText = parts
      .filter(p => p.thought === true)
      .map(p => p.text ?? "")
      .join("\n\n")
      .trim();
    if (thinkingText) opts.onThinking(thinkingText, true);
  }

  return response.text ?? "";
}

// ─── Safe JSON parse ──────────────────────────────────────────────────────────
function safeJSON<T>(text: string, fallback: T): T {
  const trimmed = text.replace(/^\uFEFF/, '').trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim()) as T;
      } catch {
        // fall through to balanced extraction
      }
    }

    const balanced = extractBalancedJson(trimmed);
    if (balanced) {
      try {
        return JSON.parse(balanced) as T;
      } catch {
        // fall through to logging
      }
    }

    console.error(
      "[Gemini] JSON parse failed.",
      { length: trimmed.length, head: trimmed.slice(0, 500), tail: trimmed.slice(-200) }
    );
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
  const primaryModel = opts.model ?? SCREENING_MODEL;
  const fallbacks =
    primaryModel === SCREENING_MODEL
      ? SCREENING_FALLBACK_MODELS
      : primaryModel === RESUME_PARSER_MODEL
        ? RESUME_PARSER_FALLBACK_MODELS
        : [];

  const modelChain = [primaryModel, ...fallbacks.filter((m) => m !== primaryModel)];

  try {
    let lastError: unknown = null;

    for (let i = 0; i < modelChain.length; i++) {
      const model = modelChain[i];
      const isFallback = i > 0;

      try {
        const effectiveOpts: GenerateOptions = {
          ...opts,
          model,
          // When we fail over to a fallback model, disable thinking to maximize compatibility
          // and reduce quota pressure.
          ...(isFallback ? { thinkingBudget: 0, onThinking: undefined } : {}),
        };

        const raw = await rateLimitService.executeWithRateLimit(
          `${cacheKey}:model:${model}`,
          () => generate(effectiveOpts),
          { useCache }
        );
        const parsed = safeJSON<T>(raw as string, fallback);
        if (useCache) rateLimitService.cacheResult(`${cacheKey}:model:${model}`, parsed);
        return parsed;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Gemini Error] ${cacheKey} (model=${model}): ${msg}`);

        // Try next fallback model
        continue;
      }
    }

    // All models failed: return fallback response
    const finalMsg = lastError instanceof Error ? lastError.message : String(lastError);
    console.error(`[Gemini Error] ${cacheKey}: all models failed. Returning fallback. Last error: ${finalMsg}`);
    return fallback;
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
  suggestedSalaryRange: { min: number; max: number; currency: string } | null;
}> {
  const fallback = {
    enhancedDescription: rawDescription,
    structuredRequirements: [],
    inferredResponsibilities: [],
    niceToHave: [],
    suggestedWeights: { skills: 35, experience: 30, education: 15, projects: 15, availability: 5 },
    suggestedSalaryRange: null,
  };

  const descriptionSection = rawDescription?.trim()
    ? `RAW JOB DESCRIPTION (enhance and structure this):\n${rawDescription}`
    : `(No description provided — generate a complete, realistic job posting from scratch based solely on the job title and your knowledge of industry-standard expectations for this role.)`;

  const prompt = `You are a senior technical recruiter at a top-tier tech company. Generate or enhance a structured job posting.

JOB TITLE: ${title}

${descriptionSection}

Your task:
1. Write a compelling, professional description (2–3 paragraphs) — if no description was provided, create one from industry knowledge for this role
2. Extract or infer ALL technical and soft skill requirements with proficiency levels
3. List 5–8 realistic key responsibilities for this role
4. Suggest nice-to-have skills (not mandatory but valuable)
5. Recommend scoring weights that make sense for THIS specific role (must sum to 100)
6. Suggest a realistic salary range in USD based on market rates for this role and level

RULES:
- Be specific about skill levels: Beginner/Intermediate/Advanced/Expert
- For "Senior" / "Lead" roles: weight experience more heavily (experience 35+%)
- For "Junior" roles: weight education and potential more (education 20+%)
- Base skills on what's genuinely required for this role — do not pad with irrelevant skills
- yearsRequired should reflect realistic expectations for the level
- Salary range should reflect current market rates (use USD, annual gross)

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
  },
  "suggestedSalaryRange": { "min": 80000, "max": 120000, "currency": "USD" }
}`;

  return generateWithRateLimit(
    `job-enhance:${title.toLowerCase().replace(/\s+/g, "-")}`,
    { prompt, model: SCREENING_MODEL, temperature: 0.3, maxOutputTokens: 4096, thinkingBudget: 0 },
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

Skills: ${c.originalProfile.skills.slice(0, 20).map(s => `${s.name} [${s.level}, ${s.yearsOfExperience}yr]`).join(" | ")}

Pre-Analysis:
  Skills Matched: ${c.skillsMatched.join(", ") || "None"}
  Skills Missing: ${c.skillsMissing.join(", ") || "None"}
  Bonus Skills: ${c.skillsBonus.join(", ") || "None"}
  Pre-Computed Skill Match Ratio: ${(c.skillMatchRatio * 100).toFixed(0)}%

Work Experience:
${c.originalProfile.experience.slice(0, 5).map(e => {
    const start = new Date(e.startDate + "-01");
    const end = e.isCurrent ? new Date() : new Date((e.endDate || "2024-01") + "-01");
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    return `  • ${e.role} @ ${e.company} (${(months / 12).toFixed(1)} yrs | ${e.isCurrent ? "Current" : e.endDate || "Past"})
    Stack: ${e.technologies.join(", ")}
    ${e.description.substring(0, 140)}${e.description.length > 140 ? "..." : ""}`;
  }).join("\n")}

Education:
${c.originalProfile.education.map(e => `  • ${e.degree} in ${e.fieldOfStudy || "N/A"} — ${e.institution} (${e.endYear || "Ongoing"})`).join("\n")}

${c.originalProfile.certifications?.length ? `Certifications: ${c.originalProfile.certifications.map(cert => cert.name).join(", ")}` : ""}

${c.originalProfile.projects?.length ? `Projects:
${c.originalProfile.projects.slice(0, 2).map(p => `  • ${p.name}: ${p.description?.substring(0, 110) || ""}... [${p.technologies?.slice(0, 8).join(", ") || "N/A"}]`).join("\n")}` : ""}

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
      "biasFlags": [
        { "type": "GENDER_LANGUAGE", "signal": "exact phrase used", "recommendation": "neutral alternative phrasing" }
      ]
    }
  ]
}
Note: biasFlags should be an empty array [] if no bias is detected. Each flag must use one of these types: GENDER_LANGUAGE, AGE_INDICATOR, LOCATION_BIAS, INSTITUTION_PRESTIGE_BIAS, NAME_BIAS.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT 3 — WHY NOT SELECTED (with full shortlist context for comparison)
// ═══════════════════════════════════════════════════════════════════════════════

function buildRankingPrompt(
  job: Job,
  shortlist: CandidateScore[],
  rejected: CandidateScore[],
  lowestShortlistScore: number
): string {
  const validRejected = rejected.filter(e => e && e.breakdown && e.finalScore !== undefined);
  if (validRejected.length === 0) return "No rejected candidates to explain.";

  // Full ranked list so the AI can see exactly where the cutoff fell
  const shortlistIds = new Set(shortlist.map(s => s.candidateId));
  const fullRankedList = [...shortlist, ...validRejected]
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((e, i) => {
      const status = shortlistIds.has(e.candidateId) ? "✅ SHORTLISTED" : "❌ NOT SELECTED";
      return `${i + 1}. [${status}] ${e.candidateName} — Score: ${e.finalScore} | Skills: ${e.breakdown?.skillsScore ?? "N/A"} | Exp: ${e.breakdown?.experienceScore ?? "N/A"} | Edu: ${e.breakdown?.educationScore ?? "N/A"} | Projects: ${e.breakdown?.projectsScore ?? "N/A"}`;
    })
    .join("\n");

  // Structured data for each rejected candidate (includes breakdown for richer context)
  const rejectedContext = validRejected
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((e, i) => ({
      rank: shortlist.length + i + 1,
      candidateId: e.candidateId,
      name: e.candidateName,
      email: e.email,
      finalScore: e.finalScore,
      scoreGap: lowestShortlistScore - e.finalScore,
      breakdown: e.breakdown,
      recommendation: e.recommendation,
      strengths: e.strengths || [],
      gaps: e.gaps || [],
      missingSkills: e.skillGapAnalysis?.missing || [],
      matchedSkills: e.skillGapAnalysis?.matched || [],
    }));

  return `You are a senior recruiter at "${job.title}" (${job.experienceLevel}) finalizing the hiring round.

The AI evaluation is complete. ${shortlist.length + validRejected.length} candidates were assessed.
The top ${shortlist.length} were shortlisted. The cutoff score was ${lowestShortlistScore}.

━━━ COMPLETE RANKED RESULTS (context for your explanations) ━━━
${fullRankedList}

━━━ SHORTLISTED CANDIDATES (who beat the cutoff and why) ━━━
${shortlist.slice(0, 5).map(s => `• ${s.candidateName} (${s.finalScore}) — strengths: ${s.strengths?.slice(0, 2).join("; ") || "N/A"}`).join("\n")}

━━━ YOUR TASK ━━━
Write a "Why Not Selected" explanation for each of the ${validRejected.length} non-shortlisted candidates below.

Each explanation MUST:
1. Open by acknowledging 1-2 genuine strengths from their profile (never start with a negative)
2. State their score and exactly how far they fell below the cutoff (${lowestShortlistScore})
3. Name the 1-3 specific, evidence-based reasons they didn't make it — reference actual profile data
4. Compare them briefly to what shortlisted candidates offered that they didn't
5. Close with 2-3 concrete, actionable improvement suggestions tied to THIS job's requirements

Tone rules:
- Professional and respectful — candidates may read this feedback directly
- Specific over generic: "Your Node.js experience is at 1 year vs the 3+ years needed" beats "lack of experience"
- Honest but never harsh — acknowledge effort, explain the bar
- Never invent skills or facts not present in the candidate data below

━━━ CANDIDATES TO EXPLAIN ━━━
${JSON.stringify(rejectedContext, null, 2)}

Return ONLY this JSON — no markdown, no commentary outside JSON:
{
  "rejectedCandidates": [
    {
      "candidateId": "id",
      "candidateName": "Full Name",
      "email": "email@example.com",
      "whyNotSelected": "Specific 3-5 sentence explanation: open with a strength, explain the score gap, name the decisive differentiators vs shortlisted candidates.",
      "topMissingSkills": ["skill1", "skill2"],
      "improvementSuggestions": [
        "Build a portfolio project demonstrating [specific missing skill] to close the most critical gap",
        "Pursue [specific certification] to validate your proficiency in [area the job requires]",
        "Seek a role with more [relevant responsibility] to reach the ${job.experienceLevel}-level depth this position demands"
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
    { prompt, model: RESUME_PARSER_MODEL, temperature: 0.1, maxOutputTokens: 6144, thinkingBudget: 0 },
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
  /** 0–100 accounting for all pipeline phases (batch eval + reranking + rejection reasons). More accurate than evaluatedCount/totalCandidates. */
  overallProgress?: number;
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

export class ScreeningCancelledError extends Error {
  constructor() { super("Screening cancelled by user"); this.name = "ScreeningCancelledError"; }
}

export async function runScreeningPipeline(
  job: Job,
  preprocessed: PreprocessedCandidate[],
  shortlistSize: number,
  onProgress?: ScreeningProgressFn,
  shouldContinue?: () => boolean
): Promise<Omit<ScreeningResult, "_id" | "screeningDate" | "createdAt">> {
  const startTime = Date.now();
  const BATCH_SIZE = Math.max(5, Math.min(20, SCREENING_BATCH_SIZE));
  const thinkingLog: ThinkingSnapshot[] = [];

  console.log(`[Screening] Using model: ${SCREENING_MODEL}`);

  // ── Phase tracking for accurate overall progress ────────────────────────────
  // Pre-compute how many Gemini calls will run so we can report a real 0–100%.
  const batchCount = Math.ceil(preprocessed.length / BATCH_SIZE);
  const willRerank = batchCount > 1 && preprocessed.length > shortlistSize;
  const willDoRejections = USE_AI_REJECTION_REASONS;
  const totalPhases = batchCount + (willRerank ? 1 : 0) + (willDoRejections ? 1 : 0);
  let completedPhases = 0;
  const overallPct = () => Math.min(95, Math.round((completedPhases / totalPhases) * 95));

  onProgress?.({
    type: "analyzing",
    message: `Analyzing ${preprocessed.length} candidate${preprocessed.length !== 1 ? "s" : ""} for "${job.title}"…`,
    evaluatedCount: 0,
    overallProgress: 0,
  });

  // ── Step 1: Evaluate candidates in sequential batches ─────────────────────
  const batches: PreprocessedCandidate[][] = [];
  for (let i = 0; i < preprocessed.length; i += BATCH_SIZE) {
    batches.push(preprocessed.slice(i, i + BATCH_SIZE));
  }

  let allEvaluations: CandidateScore[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    if (shouldContinue && !shouldContinue()) throw new ScreeningCancelledError();

    const batch = batches[batchIndex];
    const cacheKey = `screening:${job._id}:batch-${batchIndex}:size-${batch.length}`;
    const prompt = buildEvaluationPrompt(job, batch);

    const previewNames = batch.slice(0, 4).map(c => c.candidateName.split(" ")[0]).join(", ");
    const suffix = batch.length > 4 ? ` +${batch.length - 4} more` : "";
    onProgress?.({
      type: "evaluating",
      message: `Evaluating batch ${batchIndex + 1} of ${batches.length}: ${previewNames}${suffix}`,
      evaluatedCount: allEvaluations.length,
      overallProgress: overallPct(),
    });

    console.log(`[Screening] Evaluating batch ${batchIndex + 1}/${batches.length} (${batch.length} candidates)`);

    const result = await generateWithRateLimit<{ evaluations: CandidateScore[] }>(
      cacheKey,
      { prompt, model: SCREENING_MODEL, temperature: 0.2, maxOutputTokens: 32768, thinkingBudget: SCREENING_THINKING_BUDGET },
      { evaluations: [] }
    );

    allEvaluations.push(...(result.evaluations || []));
    completedPhases++;

    const partialSorted = [...allEvaluations]
      .sort((a, b) => b.finalScore - a.finalScore);
    onProgress?.({
      type: "scoring",
      message: `Batch ${batchIndex + 1} of ${batches.length} scored — ${allEvaluations.length}/${preprocessed.length} candidates evaluated`,
      liveScores: computePartialLiveScores(allEvaluations),
      partialShortlist: partialSorted,
      evaluatedCount: allEvaluations.length,
      overallProgress: overallPct(),
    });
  }

  if (allEvaluations.length === 0 && preprocessed.length > 0) {
    throw new Error(
      `AI screening failed — no evaluations returned from ${batches.length} batch(es). Check your Gemini API key and quota.`
    );
  }

  // ── Step 2: Re-rank borderline candidates across batches ──────────────────
  // Each batch is scored in isolation — Gemini calibrates relative to what it sees.
  // A score of 72 in batch 1 may not be comparable to 72 in batch 2.
  // We re-evaluate only the borderline zone (candidates near the cutoff) together
  // so Gemini can compare them directly and produce fair cross-batch rankings.
  // The clear top candidates stay; only the contested shortlist boundary is resolved.
  if (shouldContinue && !shouldContinue()) throw new ScreeningCancelledError();

  if (willRerank) {
    allEvaluations.sort((a, b) => b.finalScore - a.finalScore);

    // Keep the top (shortlistSize - 3) as safe selections; re-evaluate only the
    // contested zone capped at BATCH_SIZE so output stays within the 8 192-token limit.
    const safeCount = Math.max(0, shortlistSize - 3);
    const borderlineCount = Math.min(allEvaluations.length - safeCount, BATCH_SIZE);
    const borderlineIds = new Set(
      allEvaluations.slice(safeCount, safeCount + borderlineCount).map(e => e.candidateId)
    );
    const borderlinePreprocessed = preprocessed.filter(p => borderlineIds.has(p.candidateId));

    console.log(`[Screening] Re-ranking ${borderlinePreprocessed.length} borderline candidates (cutoff zone)`);

    onProgress?.({
      type: "analyzing",
      message: `Re-ranking ${borderlinePreprocessed.length} borderline candidates to resolve cross-batch ties…`,
      evaluatedCount: allEvaluations.length,
      overallProgress: overallPct(),
    });

    const rerankPrompt = buildEvaluationPrompt(job, borderlinePreprocessed);
    const rerankResult = await generateWithRateLimit<{ evaluations: CandidateScore[] }>(
      `screening:${job._id}:rerank-borderline`,
      { prompt: rerankPrompt, model: SCREENING_MODEL, temperature: 0.1, maxOutputTokens: 8192, thinkingBudget: SCREENING_THINKING_BUDGET },
      { evaluations: allEvaluations.filter(e => borderlineIds.has(e.candidateId)) }
    );

    // Replace borderline candidates with re-ranked scores; keep safe candidates unchanged.
    const rerankById = new Map((rerankResult.evaluations || []).map(e => [e.candidateId, e]));
    allEvaluations = allEvaluations.map(e =>
      rerankById.has(e.candidateId) ? { ...rerankById.get(e.candidateId)!, email: e.email } : e
    );
    completedPhases++;
  }

  // ── Step 3: Sort, re-number ranks, split shortlist / rejected ────────────
  // Build email lookup from source data — AI may omit or hallucinate emails
  const candidateEmailMap = new Map(preprocessed.map(p => [p.candidateId, p.email]));

  // Sanitize finalScore before sorting — re-ranking AI responses may return NaN/undefined
  // for candidates it couldn't evaluate, and NaN comparisons silently break Array.sort().
  allEvaluations = allEvaluations
    .map(e => ({
      ...e,
      finalScore: (typeof e.finalScore === 'number' && !isNaN(e.finalScore) && isFinite(e.finalScore))
        ? e.finalScore
        : 0,
    }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((e, i) => ({ ...e, rank: i + 1, email: candidateEmailMap.get(e.candidateId) || e.email || "" }));

  const shortlist = allEvaluations.slice(0, shortlistSize);
  const lowestShortlistScore = shortlist[shortlist.length - 1]?.finalScore ?? 0;

  // ── Step 4: Generate "Why Not Selected" explanations ──────────────────────
  if (shouldContinue && !shouldContinue()) throw new ScreeningCancelledError();
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

  const allRejected = [...rejectedFromEval, ...neverEvaluated]
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

  // Build a factually correct fallback rejection message.
  // Using toFixed(1) caused "52.85" to round to "52.9", making messages like
  // "Score 53.0 fell below cutoff 52.9" which are mathematically false.
  const fallbackRejectionMsg = (score: number) =>
    score >= lowestShortlistScore
      ? `Score ${score.toFixed(2)} ranked outside the top ${shortlistSize} (tied near cutoff of ${lowestShortlistScore.toFixed(2)}).`
      : `Score ${score.toFixed(2)} fell ${(lowestShortlistScore - score).toFixed(2)} points below the shortlist cutoff of ${lowestShortlistScore.toFixed(2)}.`;

  const baseRejectedCandidates: RejectedCandidate[] = allRejected.map((candidate, index) => {
    const finalScore = candidate.finalScore ?? 0;
    const missingSkills = candidate.skillGapAnalysis?.missing ?? [];
    return {
      candidateId: candidate.candidateId,
      candidateName: candidate.candidateName,
      email: candidateEmailMap.get(candidate.candidateId) || candidate.email || "",
      rank: candidate.rank ?? (shortlistSize + index + 1),
      finalScore,
      breakdown: candidate.breakdown ?? {
        skillsScore: 0,
        experienceScore: 0,
        educationScore: 0,
        projectsScore: 0,
        availabilityScore: 0,
      },
      confidenceScore: candidate.confidenceScore ?? 70,
      strengths: candidate.strengths ?? [],
      gaps: candidate.gaps ?? [],
      risks: candidate.risks ?? [],
      recommendation: candidate.recommendation ?? "Not Recommended",
      summary: candidate.summary ?? "",
      reasoning: candidate.reasoning ?? "",
      interviewQuestions: candidate.interviewQuestions ?? [],
      skillGapAnalysis: candidate.skillGapAnalysis ?? { matched: [], missing: [], bonus: [] },
      biasFlags: candidate.biasFlags ?? [],
      riskFlags: candidate.riskFlags ?? [],
      scoreGap: Math.max(0, lowestShortlistScore - finalScore),
      whyNotSelected: "",
      topMissingSkills: missingSkills.slice(0, 5),
      closestShortlistScore: lowestShortlistScore,
      improvementSuggestions: [],
    };
  });

  // Option: use a single generic message for all rejected candidates (non-AI).
  if (!USE_AI_REJECTION_REASONS) {
    rejectedCandidates = baseRejectedCandidates.map((base) => ({
      ...base,
      whyNotSelected: GENERIC_REJECTION_MESSAGE,
      improvementSuggestions: [],
    }));
  } else if (allRejected.length > 0 && shortlist.length > 0) {
    // Only send the top candidates closest to the cutoff for AI feedback.
    // Candidates far below the cutoff get a deterministic fallback.
    const AI_REJECTION_CAP = Math.min(allRejected.length, Math.max(shortlistSize, 20));
    const rejectedForAI = allRejected.slice(0, AI_REJECTION_CAP);

    onProgress?.({
      type: "generating",
      message: `Generating feedback for ${rejectedForAI.length} candidate${rejectedForAI.length !== 1 ? "s" : ""} not shortlisted…`,
      evaluatedCount: preprocessed.length,
      overallProgress: overallPct(),
    });

    // Process rejection reasons in batches of 10 so the response stays within
    // the model's 8 192-token output limit (10 candidates × ~700 chars ≈ 7 000 chars ≈ 3 500 tokens).
    const REJECTION_BATCH_SIZE = 10;
    const rejectionBatches: CandidateScore[][] = [];
    for (let i = 0; i < rejectedForAI.length; i += REJECTION_BATCH_SIZE) {
      rejectionBatches.push(rejectedForAI.slice(i, i + REJECTION_BATCH_SIZE) as CandidateScore[]);
    }

    const allAiRejected: Partial<RejectedCandidate>[] = [];
    for (let rbi = 0; rbi < rejectionBatches.length; rbi++) {
      if (shouldContinue && !shouldContinue()) throw new ScreeningCancelledError();
      const batch = rejectionBatches[rbi];
      const rankingPrompt = buildRankingPrompt(job, shortlist, batch as CandidateScore[], lowestShortlistScore);
      const rankResult = await generateWithRateLimit<{ rejectedCandidates: Partial<RejectedCandidate>[] }>(
        `screening:${job._id}:rejection-reasons-b${rbi}`,
        { prompt: rankingPrompt, model: SCREENING_MODEL, temperature: 0.3, maxOutputTokens: 8192, thinkingBudget: SCREENING_THINKING_BUDGET },
        { rejectedCandidates: [] }
      );
      allAiRejected.push(...(rankResult.rejectedCandidates || []));
    }

    const aiRejectedByCandidateId = new Map(
      allAiRejected
        .filter(r => !!r.candidateId)
        .map(r => [r.candidateId as string, r])
    );
    const aiRejectedByEmail = new Map(
      allAiRejected
        .filter(r => !!r.email)
        .map(r => [r.email as string, r])
    );

    rejectedCandidates = baseRejectedCandidates.map(base => {
      const ai = aiRejectedByCandidateId.get(base.candidateId) || aiRejectedByEmail.get(base.email);
      if (!ai) {
        return {
          ...base,
          whyNotSelected: fallbackRejectionMsg(base.finalScore),
        };
      }

      return {
        ...base,
        // Keep canonical ranking/scoring fields from computed pipeline values.
        // AI is only allowed to enrich explanatory rejection content.
        whyNotSelected: ai.whyNotSelected || fallbackRejectionMsg(base.finalScore),
        topMissingSkills: ai.topMissingSkills ?? base.topMissingSkills,
        improvementSuggestions: ai.improvementSuggestions ?? base.improvementSuggestions,
      };
    });
    completedPhases++;
  } else {
    rejectedCandidates = baseRejectedCandidates.map(base => ({
      ...base,
      whyNotSelected: fallbackRejectionMsg(base.finalScore),
    }));
  }

  // ── Step 5: Aggregate insights ────────────────────────────────────────────
  const aggregateInsights = computeAggregateInsights(shortlist);

  const processingTimeMs = Date.now() - startTime;
  console.log(`[Screening] Done in ${(processingTimeMs / 1000).toFixed(1)}s — ${shortlist.length} shortlisted, ${rejectedCandidates.length} rejected, ${thinkingLog.length} thinking snapshot(s)`);

  onProgress?.({
    type: "completed",
    message: `Screening complete — ${shortlist.length} candidates shortlisted from ${preprocessed.length} applicants`,
    liveScores: computePartialLiveScores(shortlist),
    partialShortlist: [...allEvaluations].sort((a, b) => b.finalScore - a.finalScore),
    evaluatedCount: preprocessed.length,
    overallProgress: 100,
  });

  return {
    jobId: job._id || "",
    jobTitle: job.title,
    totalApplicants: preprocessed.length,
    shortlistSize: shortlist.length,
    shortlist,
    rejectedCandidates,
    aggregateInsights,
    aiModel: SCREENING_MODEL,
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
