import { Request, Response, NextFunction } from 'express';
import { Job } from '../models/Job';
import { extractJobRequirements } from '../services/geminiService';
import { AppError, Errors } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { ScoringWeights } from '../types';

const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 35,
  experience: 30,
  education: 15,
  projects: 15,
  availability: 5,
};

/**
 * Validate that weights sum to 100
 */
function validateWeights(weights: Partial<ScoringWeights>): string | null {
  const total =
    (weights.skills || 0) +
    (weights.experience || 0) +
    (weights.education || 0) +
    (weights.projects || 0) +
    (weights.availability || 0);

  if (Math.abs(total - 100) > 1) {
    return `Scoring weights must sum to 100 (got ${total})`;
  }
  return null;
}

/**
 * @desc    Get all jobs
 * @route   GET /api/jobs
 * @access  Private
 */
export const listJobs = catchAsync(async (req: Request, res: Response) => {
  const { search, active } = req.query;
  const query: Record<string, unknown> = {};

  if (active !== undefined) {
    query.isActive = active === 'true';
  }

  if (search) {
    query.$text = { $search: search as string };
  }

  const jobs = await Job.find(query).sort({ createdAt: -1 }).lean();

  res.json({
    success: true,
    data: jobs,
    total: jobs.length,
  });
});

/**
 * @desc    Get single job
 * @route   GET /api/jobs/:id
 * @access  Private
 */
export const getJob = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const job = await Job.findById(req.params.id).lean();

  if (!job) {
    return next(Errors.notFound('Job'));
  }

  res.json({
    success: true,
    data: job,
  });
});

/**
 * @desc    Create new job
 * @route   POST /api/jobs
 * @access  Private
 */
export const createJob = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body;
  const weights = { ...DEFAULT_WEIGHTS, ...(body.weights || {}) };

  const weightError = validateWeights(weights);
  if (weightError) {
    return next(Errors.validation(weightError));
  }

  try {
    const job = await Job.create({ ...body, weights });

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return next(Errors.conflict('Job with this title already exists'));
    }
    throw error;
  }
});

/**
 * @desc    Update job
 * @route   PUT /api/jobs/:id
 * @access  Private
 */
export const updateJob = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body;

  if (body.weights) {
    const weightError = validateWeights(body.weights);
    if (weightError) {
      return next(Errors.validation(weightError));
    }
  }

  const job = await Job.findByIdAndUpdate(
    req.params.id,
    body,
    { new: true, runValidators: true }
  );

  if (!job) {
    return next(Errors.notFound('Job'));
  }

  res.json({
    success: true,
    data: job,
  });
});

/**
 * @desc    Delete job
 * @route   DELETE /api/jobs/:id
 * @access  Private
 */
export const deleteJob = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const job = await Job.findByIdAndDelete(req.params.id);

  if (!job) {
    return next(Errors.notFound('Job'));
  }

  res.json({
    success: true,
    message: 'Job deleted successfully',
    data: { id: req.params.id },
  });
});

/**
 * @desc    AI-enhance job description
 * @route   POST /api/jobs/enhance
 * @access  Private
 */
export const enhanceJob = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { description, title } = req.body as {
    description: string;
    title: string;
  };

  if (!description || !title) {
    return next(Errors.badRequest('Title and description are required'));
  }

  const enhanced = await extractJobRequirements(description, title);

  res.json({
    success: true,
    data: enhanced,
  });
});
