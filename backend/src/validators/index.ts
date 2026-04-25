import { z } from 'zod';

// ============================================
// Job Validators
// ============================================

const ScoringWeightsSchema = z.object({
  skills: z.number().min(0).max(100).default(35),
  experience: z.number().min(0).max(100).default(30),
  education: z.number().min(0).max(100).default(15),
  projects: z.number().min(0).max(100).default(15),
  availability: z.number().min(0).max(100).default(5),
});

const JobRequirementSchema = z.object({
  skill: z.string().min(1, 'Skill name is required'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
  yearsRequired: z.number().min(0).optional(),
  required: z.boolean().default(true),
});

export const CreateJobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  department: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  type: z.enum(['Full-time', 'Part-time', 'Contract', 'Freelance']),
  experienceLevel: z.enum(['Junior', 'Mid-level', 'Senior', 'Lead', 'Executive']),
  requirements: z.array(JobRequirementSchema).min(1, 'At least one requirement is required'),
  niceToHave: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).min(1, 'At least one responsibility is required'),
  salaryRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default('USD'),
  }).optional(),
  weights: ScoringWeightsSchema.optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial();

// ============================================
// Auth Validators
// ============================================

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// Candidate Validators
// ============================================

const SkillSchema = z.object({
  name: z.string(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  yearsOfExperience: z.number().default(0),
});

const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().default(''),
  technologies: z.array(z.string()).default([]),
  achievements: z.array(z.string()).optional(),
});

const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().optional(),
  startYear: z.number().optional(),
  endYear: z.number().optional(),
  gpa: z.number().optional(),
});

export const CreateCandidateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  headline: z.string().default(''),
  bio: z.string().optional(),
  location: z.string().default(''),
  skills: z.array(SkillSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
});

// ============================================
// Screening Validators
// ============================================

export const RunScreeningSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  shortlistSize: z.number().min(1).default(10),
});

// ============================================
// Validation Middleware Factory
// ============================================

import { Request, Response, NextFunction } from 'express';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        res.status(422).json({
          success: false,
          error: `Validation failed: ${messages}`,
        });
      } else {
        next(error);
      }
    }
  };
};
