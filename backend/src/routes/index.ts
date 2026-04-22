import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { rateLimitService } from "../services/rateLimitService";
import { validate, CreateJobSchema, RegisterSchema, LoginSchema, RunScreeningSchema } from "../validators";

import * as auth       from "../controllers/authController";
import * as jobs       from "../controllers/jobController";
import * as candidates from "../controllers/candidateController";
import * as screening  from "../controllers/screeningController";
import * as analytics  from "../controllers/analyticsController";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    // Accept only specific file types
    const allowedMimes = [
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, PDF, and Excel files are allowed.'));
    }
  },
});

// ============================================
// Auth Routes
// ============================================
router.post("/auth/register", validate(RegisterSchema), auth.register);
router.post("/auth/login", validate(LoginSchema), auth.login);
router.get("/auth/me", requireAuth, auth.getMe);

// ============================================
// Job Routes
// ============================================
router.get("/jobs", requireAuth, jobs.listJobs);
router.post("/jobs", requireAuth, validate(CreateJobSchema), jobs.createJob);
router.post("/jobs/enhance", requireAuth, jobs.enhanceJob);
router.get("/jobs/:id", requireAuth, jobs.getJob);
router.put("/jobs/:id", requireAuth, jobs.updateJob);
router.delete("/jobs/:id", requireAuth, jobs.deleteJob);

// ============================================
// Candidate Routes
// ============================================
router.get("/candidates", requireAuth, candidates.listCandidates);
router.get("/candidates/stats", requireAuth, candidates.getCandidateStats);
router.post("/candidates", requireAuth, candidates.createCandidate);
router.post("/candidates/bulk", requireAuth, candidates.bulkImportJSON);
router.post("/candidates/upload/csv", requireAuth, upload.single("file"), candidates.uploadCSV);
router.post("/candidates/upload/pdf", requireAuth, upload.array("files", 20), candidates.uploadPDFResumes);
router.get("/candidates/:id", requireAuth, candidates.getCandidate);
router.put("/candidates/:id", requireAuth, candidates.updateCandidate);
router.patch("/candidates/:id", requireAuth, candidates.updateCandidate);
router.delete("/candidates/:id", requireAuth, candidates.deleteCandidate);

// ============================================
// Screening Routes
// ============================================
router.post("/screening/run", requireAuth, validate(RunScreeningSchema), screening.runScreening);
router.get("/screening", requireAuth, screening.listScreeningResults);
router.get("/screening/:id", requireAuth, screening.getScreeningResult);
router.delete("/screening/:id", requireAuth, screening.deleteScreeningResult);
router.get("/screening/job/:jobId/latest", requireAuth, screening.getLatestForJob);
router.get("/screening/:resultId/why/:email", requireAuth, screening.getWhyNotSelected);

// ============================================
// Analytics Routes
// ============================================
router.get("/analytics/dashboard", requireAuth, analytics.getDashboardStats);
router.get("/analytics/job/:jobId", requireAuth, analytics.getJobAnalytics);

// ============================================
// System Monitoring
// ============================================
router.get("/system/health", (req, res) => {
  const status = rateLimitService.getQueueStatus();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    gemini: {
      queueLength: status.queueLength,
      activeRequests: status.activeRequests,
      isQuotaExceeded: status.isQuotaExceeded,
      quotaResetIn: status.quotaResetIn > 0 ? `${(status.quotaResetIn / 1000).toFixed(0)}s` : "N/A",
    },
  });
});

export default router;
