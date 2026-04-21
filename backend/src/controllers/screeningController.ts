import { Request, Response } from "express";
import { Job as JobModel } from "../models/Job";
import { Candidate } from "../models/Candidate";
import { ScreeningResultModel } from "../models/ScreeningResult";
import { runScreeningPipeline } from "../services/geminiService";
import { preprocessCandidates } from "../services/preprocessingService";
import { Job, TalentProfile } from "../types";

export const runScreening = async (req: Request, res: Response) => {
  try {
    const { jobId, candidateIds, shortlistSize = 10 } = req.body as {
      jobId: string;
      candidateIds?: string[];
      shortlistSize?: number;
    };

    if (!jobId) {
      return res.status(400).json({ success: false, error: "jobId is required" });
    }
    if (shortlistSize < 1 || shortlistSize > 20) {
      return res.status(400).json({ success: false, error: "shortlistSize must be between 1 and 20" });
    }

    // Load job
    const jobDoc = await JobModel.findById(jobId).lean();
    if (!jobDoc) return res.status(404).json({ success: false, error: "Job not found" });

    // Load candidates
    const query = candidateIds?.length ? { _id: { $in: candidateIds } } : {};
    const candidateDocs = await Candidate.find(query).lean();

    if (candidateDocs.length === 0) {
      return res.status(400).json({ success: false, error: "No candidates found. Upload candidates first." });
    }
    if (candidateDocs.length < shortlistSize) {
      return res.status(400).json({
        success: false,
        error: `Cannot shortlist ${shortlistSize} from only ${candidateDocs.length} candidates. Reduce shortlist size or add more candidates.`,
      });
    }

    const job = { ...jobDoc, _id: jobDoc._id.toString() } as unknown as Job;
    const candidates = candidateDocs.map(c => ({
      ...c,
      _id: c._id.toString(),
    })) as unknown as TalentProfile[];

    // ── Preprocessing: extract signals before AI evaluation ──────────────────
    const preprocessed = preprocessCandidates(candidates, job);

    // Sort by pre-computed score to help Gemini focus on real contenders
    preprocessed.sort((a, b) => {
      const scoreA = a.rawSkillScore * 0.35 + a.rawExperienceScore * 0.30 + a.rawEducationScore * 0.15 + a.rawProjectScore * 0.15 + a.availabilityScore * 0.05;
      const scoreB = b.rawSkillScore * 0.35 + b.rawExperienceScore * 0.30 + b.rawEducationScore * 0.15 + b.rawProjectScore * 0.15 + b.availabilityScore * 0.05;
      return scoreB - scoreA;
    });

    // ── Run AI screening ─────────────────────────────────────────────────────
    const screeningData = await runScreeningPipeline(job, preprocessed, shortlistSize);

    // ── Persist result ────────────────────────────────────────────────────────
    const result = await ScreeningResultModel.create({ ...screeningData, jobId });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("Screening error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Screening pipeline failed",
    });
  }
};

export const listScreeningResults = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.query;
    const query = jobId ? { jobId } : {};
    const results = await ScreeningResultModel
      .find(query)
      .sort({ createdAt: -1 })
      .select("-shortlist.reasoning -rejectedCandidates") // exclude heavy fields from list view
      .lean();
    res.json({ success: true, data: results, total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch results" });
  }
};

export const getScreeningResult = async (req: Request, res: Response) => {
  try {
    const result = await ScreeningResultModel.findById(req.params.id).lean();
    if (!result) return res.status(404).json({ success: false, error: "Result not found" });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch result" });
  }
};

export const getLatestForJob = async (req: Request, res: Response) => {
  try {
    const result = await ScreeningResultModel
      .findOne({ jobId: req.params.jobId })
      .sort({ createdAt: -1 })
      .lean();
    if (!result) return res.status(404).json({ success: false, error: "No screening results for this job" });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch result" });
  }
};

export const deleteScreeningResult = async (req: Request, res: Response) => {
  try {
    const result = await ScreeningResultModel.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: "Result not found" });
    res.json({ success: true, message: "Result deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete result" });
  }
};

// Get rejected candidate explanation for a specific candidate in a result
export const getWhyNotSelected = async (req: Request, res: Response) => {
  try {
    const { resultId, email } = req.params;
    const result = await ScreeningResultModel.findById(resultId).lean();
    if (!result) return res.status(404).json({ success: false, error: "Result not found" });

    const rejected = result.rejectedCandidates?.find(r => r.email === decodeURIComponent(email));
    if (!rejected) {
      // Check if they're in the shortlist
      const shortlisted = result.shortlist?.find(s => s.email === decodeURIComponent(email));
      if (shortlisted) {
        return res.json({
          success: true,
          data: { shortlisted: true, rank: shortlisted.rank, message: "This candidate was shortlisted!" },
        });
      }
      return res.status(404).json({ success: false, error: "Candidate not found in this result" });
    }

    res.json({ success: true, data: { shortlisted: false, ...rejected } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch rejection explanation" });
  }
};
