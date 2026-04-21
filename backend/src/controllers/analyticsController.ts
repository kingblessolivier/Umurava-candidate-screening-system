import { Request, Response } from "express";
import { ScreeningResultModel } from "../models/ScreeningResult";
import { Candidate } from "../models/Candidate";
import { Job } from "../models/Job";

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalJobs,
      activeJobs,
      totalCandidates,
      totalScreenings,
      recentScreenings,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ isActive: true }),
      Candidate.countDocuments(),
      ScreeningResultModel.countDocuments(),
      ScreeningResultModel
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("jobTitle totalApplicants shortlistSize screeningDate aiModel processingTimeMs")
        .lean(),
    ]);

    // Aggregate score stats across all screenings
    const scoreAgg = await ScreeningResultModel.aggregate([
      { $unwind: "$shortlist" },
      {
        $group: {
          _id: null,
          avgScore:    { $avg: "$shortlist.finalScore" },
          maxScore:    { $max: "$shortlist.finalScore" },
          totalRanked: { $sum: 1 },
          avgConfidence: { $avg: "$shortlist.confidenceScore" },
        },
      },
    ]);

    // Top performing skills across all shortlists
    const topSkills = await ScreeningResultModel.aggregate([
      { $unwind: "$shortlist" },
      { $unwind: "$shortlist.skillGapAnalysis.matched" },
      {
        $group: {
          _id:   "$shortlist.skillGapAnalysis.matched",
          count: { $sum: 1 },
          avgScore: { $avg: "$shortlist.finalScore" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    // Most common skill gaps
    const commonGaps = await ScreeningResultModel.aggregate([
      { $unwind: "$shortlist" },
      { $unwind: "$shortlist.skillGapAnalysis.missing" },
      {
        $group: {
          _id:   "$shortlist.skillGapAnalysis.missing",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Recommendation breakdown across all screenings
    const recBreakdown = await ScreeningResultModel.aggregate([
      { $unwind: "$shortlist" },
      {
        $group: {
          _id:   "$shortlist.recommendation",
          count: { $sum: 1 },
        },
      },
    ]);

    // Candidate source breakdown
    const candidateSources = await Candidate.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalJobs,
          activeJobs,
          totalCandidates,
          totalScreenings,
        },
        scoreStats: scoreAgg[0] || { avgScore: 0, maxScore: 0, totalRanked: 0, avgConfidence: 0 },
        recentScreenings,
        topSkills:   topSkills.map(s => ({ skill: s._id, count: s.count, avgScore: Math.round(s.avgScore) })),
        commonGaps:  commonGaps.map(g => ({ skill: g._id, count: g.count })),
        recBreakdown: recBreakdown.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {} as Record<string, number>),
        candidateSources: candidateSources.map(s => ({ source: s._id || "unknown", count: s.count })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to compute analytics" });
  }
};

// Per-job analytics (trends over multiple screenings)
export const getJobAnalytics = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const screenings = await ScreeningResultModel
      .find({ jobId })
      .sort({ createdAt: 1 })
      .lean();

    if (!screenings.length) {
      return res.status(404).json({ success: false, error: "No screenings for this job" });
    }

    // Score trend over time
    const scoreTrend = screenings.map(s => ({
      date: s.screeningDate,
      avgScore: s.aggregateInsights?.avgCandidateScore || 0,
      topScore: s.aggregateInsights?.topCandidateScore || 0,
      totalApplicants: s.totalApplicants,
    }));

    // Latest screening insights
    const latest = screenings[screenings.length - 1];

    res.json({
      success: true,
      data: {
        totalScreenings: screenings.length,
        scoreTrend,
        latestInsights: latest.aggregateInsights,
        latestShortlist: latest.shortlist.slice(0, 5).map(c => ({
          name: c.candidateName,
          score: c.finalScore,
          recommendation: c.recommendation,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch job analytics" });
  }
};
