import mongoose, { Schema, Document } from "mongoose";
import { Job as JobType, ScoringWeights } from "../types";

export interface JobDocument extends Omit<JobType, "_id">, Document {}

const RequirementSchema = new Schema({
  skill: { type: String, required: true },
  level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
  yearsRequired: { type: Number, min: 0 },
  required: { type: Boolean, default: true },
}, { _id: false });

const WeightsSchema = new Schema<ScoringWeights>({
  skills:       { type: Number, default: 35, min: 0, max: 100 },
  experience:   { type: Number, default: 30, min: 0, max: 100 },
  education:    { type: Number, default: 15, min: 0, max: 100 },
  projects:     { type: Number, default: 15, min: 0, max: 100 },
  availability: { type: Number, default: 5,  min: 0, max: 100 },
}, { _id: false });

const JobSchema = new Schema<JobDocument>(
  {
    title:           { type: String, required: true, trim: true },
    description:     { type: String, required: true },
    department:      { type: String, trim: true },
    location:        { type: String, required: true },
    type:            { type: String, enum: ["Full-time", "Part-time", "Contract", "Freelance"], required: true },
    experienceLevel: { type: String, enum: ["Junior", "Mid-level", "Senior", "Lead", "Executive"], required: true },
    requirements:    [RequirementSchema],
    niceToHave:      [String],
    responsibilities: [String],
    salaryRange: {
      min:      Number,
      max:      Number,
      currency: { type: String, default: "USD" },
    },
    weights:  { type: WeightsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

JobSchema.index({ title: "text", description: "text" });
JobSchema.index({ isActive: 1, createdAt: -1 });

export const Job = mongoose.model<JobDocument>("Job", JobSchema);
