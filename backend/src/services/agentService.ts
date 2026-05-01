import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Job } from "../models/Job";
import { Candidate } from "../models/Candidate";
import { ScreeningResultModel } from "../models/ScreeningResult";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResponse {
  reply: string;
  data?: {
    type: "jobs" | "candidates" | "screening" | "analytics" | "action";
    items?: unknown[];
    summary?: Record<string, unknown>;
  };
}

// ─── Gemini client ────────────────────────────────────────────────────────────
function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenAI({ apiKey: key });
}

const CHAT_MODEL = (
  process.env.CHAT_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-2.5-flash-lite-preview-06-17"
).trim();

// ─── System prompt ────────────────────────────────────────────────────────────
const AGENT_SYSTEM_PROMPT = `You are TalentAI Agent, an intelligent HR assistant embedded inside a talent acquisition platform.

Your personality:
- Professional but friendly and conversational
- Proactive: suggest next steps when relevant
- Concise: keep replies short unless the user asks for details
- Always speak in first person ("I found...", "I can help you...")

Your capabilities:
- Query jobs, candidates, screening results, and analytics
- Move candidates through pipeline stages
- Summarize hiring data and give actionable insights
- Guide users through the platform features

Rules:
- When listing data, always include names and key metrics
- When updating a stage, confirm what you did clearly
- If data is empty, say so and suggest what the user can do
- Never make up candidate names, scores, or job details — only use tool results
- Respond in plain conversational text. Do not use markdown headers or bullet points in short replies.`;

// ─── Tool definitions ─────────────────────────────────────────────────────────
const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "list_jobs",
    description: "List jobs on the platform, optionally filtered by status or department.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        isActive: { type: Type.BOOLEAN, description: "true = open jobs only, false = closed only, omit = all" },
        department: { type: Type.STRING, description: "Filter by department name" },
        limit: { type: Type.NUMBER, description: "Max jobs to return (default 8)" },
      },
    },
  },
  {
    name: "list_candidates",
    description: "Search candidates with optional filters. Use to find people by name, stage, job, or availability.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: "Filter to candidates for a specific job ID" },
        pipelineStatus: {
          type: Type.STRING,
          description: "Filter by stage: pending, screening, screened, rejected, interview_scheduled, interviewed, offer_sent, accepted, declined",
        },
        search: { type: Type.STRING, description: "Search by candidate name or email" },
        limit: { type: Type.NUMBER, description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "get_top_candidates",
    description: "Get the highest-scoring shortlisted candidates from the latest screening for a job.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: "Job ID to get top candidates for" },
        limit: { type: Type.NUMBER, description: "Number of top candidates (default 5)" },
      },
      required: ["jobId"],
    },
  },
  {
    name: "get_screening_results",
    description: "Get screening run summaries. Use to answer questions about scores, processing times, model used.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: "Filter by job ID" },
        limit: { type: Type.NUMBER, description: "Max results (default 5)" },
      },
    },
  },
  {
    name: "get_analytics",
    description: "Get hiring dashboard statistics: total jobs, candidates, screenings, average scores.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "update_candidate_stage",
    description: "Move a candidate to a new pipeline stage. Ask for confirmation before calling this.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        candidateId: { type: Type.STRING, description: "MongoDB _id of the candidate" },
        stage: {
          type: Type.STRING,
          description: "Pipeline stage: pending, screening, screened, rejected, interview_scheduled, interviewed, offer_sent, accepted, declined",
        },
      },
      required: ["candidateId", "stage"],
    },
  },
  {
    name: "get_candidate_details",
    description: "Get the full profile of a candidate: skills, experience, education, certifications, availability.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        candidateId: { type: Type.STRING, description: "MongoDB _id of the candidate" },
      },
      required: ["candidateId"],
    },
  },
  {
    name: "get_job_details",
    description: "Get full details of a job: requirements, salary, weights, description.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: "MongoDB _id of the job" },
      },
      required: ["jobId"],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ data: unknown; type: string }> {
  switch (name) {
    case "list_jobs": {
      const filter: Record<string, unknown> = {};
      if (args.isActive !== undefined) filter.isActive = args.isActive;
      if (args.department) filter.department = new RegExp(String(args.department), "i");
      const jobs = await Job.find(filter)
        .select("title department location type experienceLevel isActive salaryRange createdAt")
        .sort({ createdAt: -1 })
        .limit(Number(args.limit) || 8)
        .lean();
      return { type: "jobs", data: jobs };
    }

    case "list_candidates": {
      const filter: Record<string, unknown> = {};
      if (args.jobId) filter.jobId = args.jobId;
      if (args.pipelineStatus) filter.pipelineStatus = args.pipelineStatus;
      if (args.search) {
        const re = new RegExp(String(args.search), "i");
        filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
      }
      const candidates = await Candidate.find(filter)
        .select("firstName lastName email pipelineStatus skills location availability jobId createdAt")
        .sort({ createdAt: -1 })
        .limit(Number(args.limit) || 10)
        .lean();
      return { type: "candidates", data: candidates };
    }

    case "get_top_candidates": {
      const latest = await ScreeningResultModel.findOne({ jobId: args.jobId })
        .sort({ createdAt: -1 })
        .lean();
      if (!latest) return { type: "candidates", data: [] };
      const top = [...(latest.shortlist || [])]
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, Number(args.limit) || 5);
      return { type: "candidates", data: top };
    }

    case "get_screening_results": {
      const filter: Record<string, unknown> = {};
      if (args.jobId) filter.jobId = args.jobId;
      const results = await ScreeningResultModel.find(filter)
        .select("jobTitle totalApplicants shortlistSize screeningDate aiModel processingTimeMs aggregateInsights.avgCandidateScore aggregateInsights.topCandidateScore")
        .sort({ createdAt: -1 })
        .limit(Number(args.limit) || 5)
        .lean();
      return { type: "screening", data: results };
    }

    case "get_analytics": {
      const [totalJobs, activeJobs, totalCandidates, totalScreenings] = await Promise.all([
        Job.countDocuments(),
        Job.countDocuments({ isActive: true }),
        Candidate.countDocuments(),
        ScreeningResultModel.countDocuments(),
      ]);
      const stageBreakdown = await Candidate.aggregate([
        { $group: { _id: "$pipelineStatus", count: { $sum: 1 } } },
      ]);
      const scoreAgg = await ScreeningResultModel.aggregate([
        { $unwind: "$shortlist" },
        { $group: { _id: null, avgScore: { $avg: "$shortlist.finalScore" }, maxScore: { $max: "$shortlist.finalScore" } } },
      ]);
      return {
        type: "analytics",
        data: {
          totalJobs,
          activeJobs,
          totalCandidates,
          totalScreenings,
          stageBreakdown: Object.fromEntries(stageBreakdown.map((s) => [s._id, s.count])),
          avgScore: scoreAgg[0]?.avgScore?.toFixed(1) ?? "N/A",
          topScore: scoreAgg[0]?.maxScore?.toFixed(1) ?? "N/A",
        },
      };
    }

    case "update_candidate_stage": {
      const updated = await Candidate.findByIdAndUpdate(
        args.candidateId,
        { pipelineStatus: args.stage },
        { new: true }
      ).select("firstName lastName pipelineStatus").lean();
      if (!updated) return { type: "action", data: { success: false, message: "Candidate not found" } };
      return {
        type: "action",
        data: {
          success: true,
          candidateName: `${updated.firstName} ${updated.lastName}`,
          newStage: updated.pipelineStatus,
        },
      };
    }

    case "get_candidate_details": {
      const candidate = await Candidate.findById(args.candidateId).lean();
      return { type: "candidates", data: candidate };
    }

    case "get_job_details": {
      const job = await Job.findById(args.jobId).lean();
      return { type: "jobs", data: job };
    }

    default:
      return { type: "error", data: { message: `Unknown tool: ${name}` } };
  }
}

// ─── Main agent runner ────────────────────────────────────────────────────────
export async function runAgent(
  userMessage: string,
  history: ChatMessage[]
): Promise<AgentResponse> {
  const ai = getClient();

  // Build conversation contents
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let lastData: AgentResponse["data"] | undefined;
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents,
      config: {
        systemInstruction: AGENT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 1024,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      },
    });

    const parts = (response.candidates?.[0]?.content?.parts ?? []) as Array<{
      text?: string;
      functionCall?: { name: string; args: Record<string, unknown> };
    }>;

    const functionCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall!);

    // No more tool calls — return the final text response
    if (functionCalls.length === 0) {
      const replyText = parts
        .filter((p) => p.text)
        .map((p) => p.text!)
        .join("")
        .trim();

      return { reply: replyText || "I'm not sure how to respond to that.", data: lastData };
    }

    // Execute all requested tools in parallel
    const toolResults = await Promise.all(
      functionCalls.map((fc) => executeTool(fc.name, fc.args || {}))
    );

    // Store the last data result for the response
    const dataResult = toolResults.find((r) => r.type !== "error");
    if (dataResult) {
      const resultData = dataResult.data;
      type DataType = NonNullable<AgentResponse["data"]>["type"];
      if (Array.isArray(resultData)) {
        lastData = { type: dataResult.type as DataType, items: resultData };
      } else {
        lastData = { type: dataResult.type as DataType, summary: resultData as Record<string, unknown> };
      }
    }

    // Add model turn (with function calls) to history
    contents.push({ role: "model", parts: parts as Array<Record<string, unknown>> });

    // Add tool results back
    contents.push({
      role: "user",
      parts: toolResults.map((result, i) => ({
        functionResponse: {
          name: functionCalls[i].name,
          response: { result: JSON.stringify(result.data) },
        },
      })),
    });
  }

  return { reply: "I ran into an issue processing your request. Please try again." };
}
