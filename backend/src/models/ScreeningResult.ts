import mongoose, { Schema, Document } from "mongoose";
import { ScreeningResult } from "../types";

export interface ScreeningResultDocument extends Omit<ScreeningResult, "_id">, Document {}

const BiasFlagSchema = new Schema({
  type:           { type: String, enum: ["GENDER_LANGUAGE", "AGE_INDICATOR", "LOCATION_BIAS", "INSTITUTION_PRESTIGE_BIAS", "NAME_BIAS"] },
  signal:         String,
  recommendation: String,
}, { _id: false });

const RiskFlagSchema = new Schema({
  type:     { type: String, enum: ["SKILL_UNVERIFIED", "SHORT_TENURE", "EMPLOYMENT_GAP", "MISSING_CRITICAL_SKILL", "OVERQUALIFIED", "LOCATION_MISMATCH"] },
  detail:   String,
  severity: { type: String, enum: ["low", "medium", "high"] },
}, { _id: false });

const CandidateScoreSchema = new Schema({
  candidateId:    { type: String, required: true },
  candidateName:  { type: String, required: true },
  email:          { type: String, required: true },
  rank:           { type: Number, required: true },
  finalScore:     { type: Number, required: true, min: 0, max: 100 },
  breakdown: {
    skillsScore:       { type: Number, default: 0 },
    experienceScore:   { type: Number, default: 0 },
    educationScore:    { type: Number, default: 0 },
    projectsScore:     { type: Number, default: 0 },
    availabilityScore: { type: Number, default: 0 },
  },
  confidenceScore:  { type: Number, min: 0, max: 100, default: 70 },
  strengths:        [String],
  gaps:             [String],
  risks:            [String],
  recommendation: {
    type: String,
    enum: ["Strongly Recommended", "Recommended", "Consider", "Not Recommended"],
  },
  summary:          String,
  reasoning:        String,
  interviewQuestions: [String],
  skillGapAnalysis: {
    matched: [String],
    missing: [String],
    bonus:   [String],
  },
  biasFlags: [BiasFlagSchema],
  riskFlags: [RiskFlagSchema],
}, { _id: false });

const RejectedCandidateSchema = new Schema({
  candidateId:          { type: String, required: true },
  candidateName:        { type: String, required: true },
  email:                { type: String, required: true },
  finalScore:           Number,
  whyNotSelected:       String,
  topMissingSkills:     [String],
  closestShortlistScore: Number,
  improvementSuggestions: [String],
}, { _id: false });

const ScreeningResultSchema = new Schema<ScreeningResultDocument>(
  {
    jobId:      { type: String, required: true, index: true },
    jobTitle:   { type: String, required: true },
    totalApplicants: { type: Number, required: true },
    shortlistSize:   { type: Number, required: true },
    shortlist:       [CandidateScoreSchema],
    rejectedCandidates: [RejectedCandidateSchema],
    aggregateInsights: {
      skillDemand:  [{ skill: String, count: Number, avgScore: Number, _id: false }],
      commonGaps:   [{ skill: String, missingCount: Number, _id: false }],
      scoreDistribution: [{ range: String, count: Number, _id: false }],
      avgScoreByCategory: {
        skillsScore: Number,
        experienceScore: Number,
        educationScore: Number,
        projectsScore: Number,
        availabilityScore: Number,
      },
      topCandidateScore:  Number,
      avgCandidateScore:  Number,
      recommendationBreakdown: { type: Map, of: Number },
    },
    screeningDate:    { type: Date, default: Date.now },
    aiModel:          { type: String, default: "gemini-2.5-flash" },
    processingTimeMs: Number,
    thinkingLog: [{
      stage:          { type: String, enum: ["evaluating", "reranking", "rejection"] },
      batchIndex:     Number,
      batchLabel:     String,
      candidateNames: [String],
      thinking:       String,
      timestamp:      String,
      _id:            false,
    }],
  },
  { timestamps: true }
);

ScreeningResultSchema.index({ jobId: 1, createdAt: -1 });

export const ScreeningResultModel = mongoose.model<ScreeningResultDocument>(
  "ScreeningResult",
  ScreeningResultSchema
);
