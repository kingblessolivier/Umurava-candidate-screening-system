import { Request, Response } from "express";
import { Candidate } from "../models/Candidate";
import { parseResumeToProfile } from "../services/geminiService";
import {
  createJob,
  updateJob,
  sendNotificationToUser,
} from "../services/backgroundJobService";
import { TalentProfile } from "../types";
import csv from "csv-parser";
import { Readable } from "stream";
import pdfParse from "pdf-parse";
import * as XLSX from "xlsx";

type AuthedRequest = Request & { user?: { _id: string } };

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export const listCandidates = async (req: Request, res: Response) => {
  try {
    const page   = Math.max(1, Number(req.query.page) || 1);
    const limit  = Math.min(100, Number(req.query.limit) || 50);
    const skip   = (page - 1) * limit;
    const search = req.query.search as string;
    const jobId  = req.query.jobId as string;

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName:  { $regex: search, $options: "i" } },
        { email:     { $regex: search, $options: "i" } },
        { "skills.name": { $regex: search, $options: "i" } },
      ];
    }
    if (jobId) {
      query.jobId = jobId;
    }

    const [candidates, total] = await Promise.all([
      Candidate.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Candidate.countDocuments(query),
    ]);

    res.json({ success: true, data: candidates, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch candidates" });
  }
};

export const getCandidate = async (req: Request, res: Response) => {
  try {
    const c = await Candidate.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ success: false, error: "Candidate not found" });
    res.json({ success: true, data: c });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch candidate" });
  }
};

export const createCandidate = async (req: Request, res: Response) => {
  try {
    const { jobId, ...candidateData } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ success: false, error: "jobId is required" });
    }

    // Verify the job exists
    const { Job } = await import("../models/Job");
    const jobExists = await Job.findById(jobId);
    if (!jobExists) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    const c = await Candidate.create({ ...candidateData, jobId, source: "platform" });
    res.status(201).json({ success: true, data: c });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 11000) return res.status(409).json({ success: false, error: "A candidate with this email already exists" });
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to create candidate" });
  }
};

export const updateCandidate = async (req: Request, res: Response) => {
  try {
    const c = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!c) return res.status(404).json({ success: false, error: "Candidate not found" });
    res.json({ success: true, data: c });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to update candidate" });
  }
};

export const deleteCandidate = async (req: Request, res: Response) => {
  try {
    const c = await Candidate.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ success: false, error: "Candidate not found" });
    res.json({ success: true, message: "Candidate deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete candidate" });
  }
};

// ─── Bulk Import (JSON array) ──────────────────────────────────────────────────

export const bulkImportJSON = async (req: Request, res: Response) => {
  try {
    const profiles = req.body as TalentProfile[];
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({ success: false, error: "Send a non-empty JSON array of candidate profiles" });
    }
    if (profiles.length > 200) {
      return res.status(400).json({ success: false, error: "Maximum 200 candidates per bulk import" });
    }

    const { Job } = await import("../models/Job");
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const profile of profiles) {
      try {
        // Validate jobId is present
        if (!profile.jobId) {
          results.errors.push(`${profile.email}: Missing jobId`);
          continue;
        }

        // Verify job exists
        const jobExists = await Job.findById(profile.jobId);
        if (!jobExists) {
          results.errors.push(`${profile.email}: Job ${profile.jobId} not found`);
          continue;
        }

        await Candidate.create({ ...profile, source: "json" });
        results.created++;
      } catch (err: unknown) {
        const code = (err as { code?: number }).code;
        if (code === 11000) results.skipped++;
        else results.errors.push(`${profile.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: "Bulk import failed" });
  }
};

// ─── CSV Upload ───────────────────────────────────────────────────────────────

export const uploadCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

    // Support both .csv and .xlsx
    const isExcel = req.file.originalname.match(/\.(xlsx|xls)$/i);
    let rows: Record<string, string>[] = [];

    if (isExcel) {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    } else {
      // Parse CSV from buffer
      await new Promise<void>((resolve, reject) => {
        const readable = Readable.from(req.file!.buffer.toString());
        readable.pipe(csv())
          .on("data", (row: Record<string, string>) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });
    }

    const { Job } = await import("../models/Job");
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      const email = row.email || row.Email;
      if (!email) { results.errors.push("Row missing email — skipped"); continue; }

      try {
        const jobId = row.jobId || row.JobId || row.job_id;
        if (!jobId) {
          results.errors.push(`${email}: Missing jobId — skipped`);
          continue;
        }

        // Verify job exists
        const jobExists = await Job.findById(jobId);
        if (!jobExists) {
          results.errors.push(`${email}: Job ${jobId} not found — skipped`);
          continue;
        }

        const skills = (row.skills || row.Skills || "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => ({ name: s, level: "Intermediate" as const, yearsOfExperience: 1 }));

        await Candidate.create({
          firstName:  row.firstName  || row.first_name  || row["First Name"]  || "Unknown",
          lastName:   row.lastName   || row.last_name   || row["Last Name"]   || "Unknown",
          email:      email.toLowerCase().trim(),
          headline:   row.headline   || row.Headline    || "",
          location:   row.location   || row.Location    || "",
          bio:        row.bio        || row.Bio         || "",
          jobId,
          skills,
          experience: [],
          education:  [],
          availability: {
            status: "Available",
            type:   (row.availabilityType || row.type || "Full-time") as "Full-time",
          },
          source: "csv",
        });
        results.created++;
      } catch (err: unknown) {
        const code = (err as { code?: number }).code;
        if (code === 11000) results.skipped++;
        else results.errors.push(`${email}: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: "CSV/Excel processing failed" });
  }
};

// ─── PDF Resume Upload (background) ───────────────────────────────────────────

export const uploadPDFResumes = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ success: false, error: "No PDF files uploaded" });
    if (files.length > 20) return res.status(400).json({ success: false, error: "Maximum 20 PDFs per upload" });

    const jobId = (req.query.jobId as string) || (req.headers["x-job-id"] as string);
    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: "jobId is required (pass as query parameter ?jobId=<id> or header X-Job-Id)",
      });
    }

    const { Job } = await import("../models/Job");
    const jobExists = await Job.findById(jobId).lean();
    if (!jobExists) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found` });
    }

    const userId = (req as AuthedRequest).user!._id;
    const bgJob = createJob("pdf_upload", userId, {
      jobId,
      jobTitle: (jobExists as { title?: string }).title ?? jobId,
      fileCount: files.length,
    });

    // Respond immediately so the user can navigate away
    res.status(202).json({
      success: true,
      data: {
        jobId: bgJob.id,
        status: "pending",
        message: `Parsing ${files.length} resume(s) in the background. You'll be notified when done.`,
      },
    });

    // ── Process PDFs asynchronously ───────────────────────────────────────────
    // Copy buffers now — multer recycles request memory after the response is sent
    const fileSnapshots = files.map((f) => ({
      originalname: f.originalname,
      buffer: Buffer.from(f.buffer), // defensive copy
    }));

    setImmediate(async () => {
      try {
        updateJob(bgJob.id, "running");

        const results = { parsed: [] as object[], errors: [] as string[] };
        const jobTitle = (bgJob.metadata.jobTitle as string) ?? jobId;

        // ── Phase 1: Extract text from all PDFs sequentially ─────────────────
        // pdfjs-dist allocates a large WASM heap per parse. Running extractions
        // in parallel exhausts Node's addressable memory (RangeError: Array buffer
        // allocation failed) via a native EventEmitter that escapes try/catch.
        type Extracted = { originalname: string; cleanedText: string; email?: string };
        const extracted: Extracted[] = [];

        for (const file of fileSnapshots) {
          try {
            const pdfData = await pdfParse(file.buffer);
            const cleanedText = pdfData.text
              .replace(/\r\n/g, "\n")
              .replace(/\r/g, "\n")
              .replace(/[ \t]+/g, " ")
              .replace(/\n{3,}/g, "\n\n")
              .replace(/^\s*\d+\s*$/gm, "")
              .replace(/[^\x00-\x7F]/g, " ")
              .trim();

            const emailMatch = cleanedText.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
            extracted.push({
              originalname: file.originalname,
              cleanedText,
              email: emailMatch?.[0]?.toLowerCase(),
            });
          } catch (err) {
            results.errors.push(
              `${file.originalname}: PDF read failed — ${err instanceof Error ? err.message : "unknown"}`
            );
          }
        }

        // ── Phase 2: Parse all extracted texts concurrently via Gemini ────────
        // The rate-limiter (MAX_CONCURRENT_REQUESTS = 2) caps concurrency so we
        // don't hammer the API. Running these concurrently cuts total wall-clock
        // time roughly in half versus the old sequential approach.
        let completed = 0;
        const total = extracted.length;

        await Promise.allSettled(
          extracted.map(async ({ originalname, cleanedText, email }) => {
            try {
              const profile = await parseResumeToProfile(cleanedText, email);

              const candidate = await Candidate.findOneAndUpdate(
                { email: profile.email || email },
                { ...profile, jobId, source: "pdf", parsedResumeText: cleanedText.substring(0, 6000) },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );

              results.parsed.push({
                candidateId: candidate._id,
                name:  `${profile.firstName} ${profile.lastName}`,
                email: profile.email || email,
              });
            } catch (err) {
              results.errors.push(
                `${originalname}: ${err instanceof Error ? err.message : "Parse failed"}`
              );
            } finally {
              completed++;
              // Progress update after every resume so the user isn't left waiting
              if (completed < total) {
                sendNotificationToUser(userId, {
                  type: "job_update",
                  jobId: bgJob.id,
                  jobType: "pdf_upload",
                  status: "running",
                  title: "Parsing Resumes…",
                  message: `${completed} of ${total} resume(s) processed for "${jobTitle}"`,
                  metadata: bgJob.metadata,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          })
        );

        updateJob(bgJob.id, "done", {
          parsed: results.parsed.length,
          errors: results.errors.length,
        });

        sendNotificationToUser(userId, {
          type: "job_update",
          jobId: bgJob.id,
          jobType: "pdf_upload",
          status: "done",
          title: "Resume Upload Complete",
          message: `${results.parsed.length} of ${fileSnapshots.length} resume(s) parsed for "${jobTitle}".${
            results.errors.length ? ` ${results.errors.length} failed.` : ""
          }`,
          metadata: bgJob.metadata,
          result: { parsed: results.parsed.length, errors: results.errors.length },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : "PDF parsing failed";
        updateJob(bgJob.id, "failed", undefined, error);
        sendNotificationToUser(userId, {
          type: "job_update",
          jobId: bgJob.id,
          jobType: "pdf_upload",
          status: "failed",
          title: "Resume Upload Failed",
          message: error,
          metadata: bgJob.metadata,
          error,
          timestamp: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "PDF upload failed" });
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getCandidateStats = async (_req: Request, res: Response) => {
  try {
    const [total, bySource, topSkills] = await Promise.all([
      Candidate.countDocuments(),
      Candidate.aggregate([{ $group: { _id: "$source", count: { $sum: 1 } } }]),
      Candidate.aggregate([
        { $unwind: "$skills" },
        { $group: { _id: "$skills.name", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);
    res.json({ success: true, data: { total, bySource, topSkills } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
};
