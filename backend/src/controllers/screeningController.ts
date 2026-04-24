import { Request, Response } from "express";
import { Job as JobModel } from "../models/Job";
import { Candidate } from "../models/Candidate";
import { ScreeningResultModel } from "../models/ScreeningResult";
import { runScreeningPipeline, ScreeningProgressFn } from "../services/geminiService";
import { preprocessCandidates } from "../services/preprocessingService";
import {
  createJob,
  updateJob,
  sendNotificationToUser,
} from "../services/backgroundJobService";
import { Job, TalentProfile } from "../types";

type AuthedRequest = Request & { user?: { _id: string } };

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
    if (shortlistSize < 1) {
      return res.status(400).json({ success: false, error: "shortlistSize must be at least 1" });
    }

    // Validate job + candidates before accepting the job so we can fail fast
    const jobDoc = await JobModel.findById(jobId).lean();
    if (!jobDoc) return res.status(404).json({ success: false, error: "Job not found" });

    const query: Record<string, unknown> = candidateIds?.length
      ? { _id: { $in: candidateIds } }
      : { jobId };
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

    const userId = (req as AuthedRequest).user!._id;

    // Create a background job record and respond immediately (202 Accepted)
    const bgJob = createJob("screening", userId, {
      jobId,
      jobTitle: jobDoc.title,
      candidateCount: candidateDocs.length,
      shortlistSize,
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: bgJob.id,
        status: "pending",
        message: "Screening started in the background. You'll be notified when it's done.",
      },
    });

    // ── Run the actual AI pipeline asynchronously ─────────────────────────────
    setImmediate(async () => {
      try {
        updateJob(bgJob.id, "running");

        const job = { ...jobDoc, _id: jobDoc._id.toString() } as unknown as Job;
        const candidates = candidateDocs.map((c) => ({
          ...c,
          _id: c._id.toString(),
        })) as unknown as TalentProfile[];

        const preprocessed = preprocessCandidates(candidates, job);
        preprocessed.sort((a, b) => {
          const scoreA =
            a.rawSkillScore * 0.35 +
            a.rawExperienceScore * 0.30 +
            a.rawEducationScore * 0.15 +
            a.rawProjectScore * 0.15 +
            a.availabilityScore * 0.05;
          const scoreB =
            b.rawSkillScore * 0.35 +
            b.rawExperienceScore * 0.30 +
            b.rawEducationScore * 0.15 +
            b.rawProjectScore * 0.15 +
            b.availabilityScore * 0.05;
          return scoreB - scoreA;
        });

        // Emit real-time progress via SSE so the frontend can show AI thinking
        const onProgress: ScreeningProgressFn = (event) => {
          sendNotificationToUser(userId, {
            type: "job_update",
            jobId: bgJob.id,
            jobType: "screening",
            status: "running",
            title: "Screening in Progress",
            message: event.message,
            metadata: {
              ...bgJob.metadata,
              progressEvent: event,
            },
            timestamp: new Date().toISOString(),
          });
        };

        const screeningData = await runScreeningPipeline(job, preprocessed, shortlistSize, onProgress);
        const result = await ScreeningResultModel.create({ ...screeningData, jobId });

        updateJob(bgJob.id, "done", { screeningResultId: result._id.toString() });

        sendNotificationToUser(userId, {
          type: "job_update",
          jobId: bgJob.id,
          jobType: "screening",
          status: "done",
          title: "Screening Complete",
          message: `"${jobDoc.title}" screening done — ${result.shortlist?.length ?? shortlistSize} candidates shortlisted.`,
          metadata: bgJob.metadata,
          result: { screeningResultId: result._id.toString() },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Screening pipeline failed";
        updateJob(bgJob.id, "failed", undefined, error);
        sendNotificationToUser(userId, {
          type: "job_update",
          jobId: bgJob.id,
          jobType: "screening",
          status: "failed",
          title: "Screening Failed",
          message: `Screening for "${jobDoc.title}" failed: ${error}`,
          metadata: bgJob.metadata,
          error,
          timestamp: new Date().toISOString(),
        });
      }
    });
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
      .select("-shortlist.reasoning -rejectedCandidates.whyNotSelected -rejectedCandidates.improvementSuggestions -rejectedCandidates.topMissingSkills -rejectedCandidates.closestShortlistScore")
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

export const getWhyNotSelected = async (req: Request, res: Response) => {
  try {
    const { resultId, email } = req.params;
    const result = await ScreeningResultModel.findById(resultId).lean();
    if (!result) return res.status(404).json({ success: false, error: "Result not found" });

    const rejected = result.rejectedCandidates?.find(
      (r) => r.email === decodeURIComponent(email)
    );
    if (!rejected) {
      const shortlisted = result.shortlist?.find(
        (s) => s.email === decodeURIComponent(email)
      );
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
