import mongoose, { Schema, Document } from "mongoose";
import { TalentProfile } from "../types";

export interface CandidateDocument extends Omit<TalentProfile, "_id" | "jobId">, Document {
  jobId: mongoose.Types.ObjectId;
}

const SkillSchema = new Schema({
  name:              { type: String, required: true },
  level:             { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"], required: true },
  yearsOfExperience: { type: Number, default: 0 },
}, { _id: false });

const ExperienceSchema = new Schema({
  company:      { type: String, required: true },
  role:         { type: String, required: true },
  startDate:    { type: String, required: true },
  endDate:      String,
  isCurrent:    { type: Boolean, default: false },
  description:  { type: String, default: "" },
  technologies: [String],
  achievements: [String],
}, { _id: false });

const EducationSchema = new Schema({
  institution: { type: String, required: true },
  degree:      { type: String, required: true },
  fieldOfStudy: String,
  startYear:   Number,
  endYear:     Number,
  gpa:         Number,
}, { _id: false });

const CertificationSchema = new Schema({
  name:          { type: String, required: true },
  issuer:        String,
  issueDate:     String,
  expiryDate:    String,
  credentialUrl: String,
}, { _id: false });

const ProjectSchema = new Schema({
  name:         { type: String, required: true },
  description:  String,
  technologies: [String],
  role:         String,
  link:         String,
  startDate:    String,
  endDate:      String,
  impact:       String,
}, { _id: false });

const CandidateSchema = new Schema<CandidateDocument>(
  {
    firstName:   { type: String, required: true, trim: true },
    lastName:    { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true },
    phone:       String,
    headline:    { type: String, default: "" },
    bio:         String,
    location:    { type: String, default: "" },
    jobId:       { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    skills:      [SkillSchema],
    languages:   [{
      name:        String,
      proficiency: { type: String, enum: ["Basic", "Conversational", "Fluent", "Native"] },
      _id: false,
    }],
    experience:     [ExperienceSchema],
    education:      [EducationSchema],
    certifications: [CertificationSchema],
    projects:       [ProjectSchema],
    availability: {
      status:              { type: String, enum: ["Available", "Open to Opportunities", "Not Available"], default: "Available" },
      type:                { type: String, enum: ["Full-time", "Part-time", "Contract", "Freelance"], default: "Full-time" },
      noticePeriod:        String,
      preferredStartDate:  String,
    },
    socialLinks: {
      linkedin:  String,
      github:    String,
      portfolio: String,
      twitter:   String,
    },
    source:           { type: String, enum: ["platform", "csv", "pdf", "json"], default: "platform" },
    parsedResumeText: String,
  },
  { timestamps: true }
);

CandidateSchema.index({ "skills.name": 1 });
CandidateSchema.index({ createdAt: -1 });

export const Candidate = mongoose.model<CandidateDocument>("Candidate", CandidateSchema);
