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

type ImportSummary = {
  created: number;
  skipped: number;
  errors: string[];
};

const getJobId = (req: Request) =>
  (req.query.jobId as string) || (req.headers["x-job-id"] as string) || "";

const isDuplicateKeyError = (err: unknown) => (err as { code?: number }).code === 11000;

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
    const jobId = getJobId(req) || profiles.find((profile) => profile.jobId)?.jobId || "";
    if (!jobId) {
      return res.status(400).json({ success: false, error: "jobId is required" });
    }

    const jobExists = await Job.findById(jobId).lean();
    if (!jobExists) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found` });
    }

    const userId = (req as AuthedRequest).user!._id;
    const jobTitle = (jobExists as { title?: string }).title ?? jobId;
    const bgJob = createJob("json_import", userId, {
      jobId,
      jobTitle,
      candidateCount: profiles.length,
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: bgJob.id,
        status: "pending",
        message: `Importing ${profiles.length} candidate(s) in the background. You'll be notified when done.`,
      },
    });

    const candidateSnapshots = profiles.map((profile) => ({
      ...profile,
      jobId,
    }));

    setImmediate(async () => {
      try {
        updateJob(bgJob.id, "running");

        const results: ImportSummary = { created: 0, skipped: 0, errors: [] };

        for (const profile of candidateSnapshots) {
          try {
            await Candidate.create({ ...normalizeJSONProfile(profile), source: "json" });
            results.created++;
          } catch (err: unknown) {
            if (isDuplicateKeyError(err)) results.skipped++;
            else results.errors.push(`${profile.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
          }
        }

        updateJob(bgJob.id, "done", results);
        sendNotificationToUser(userId, {
          type: "job_update",
          jobId: bgJob.id,
          jobType: "json_import",
          status: "done",
          title: "JSON Import Complete",
          message: `${results.created} of ${candidateSnapshots.length} candidate(s) imported for "${jobTitle}".${results.errors.length ? ` ${results.errors.length} failed.` : ""}`,
          metadata: bgJob.metadata,
          result: results,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : "JSON import failed";
        updateJob(bgJob.id, "failed", undefined, error);
        sendNotificationToUser(userId, {
          type: "job_update",
          jobId: bgJob.id,
          jobType: "json_import",
          status: "failed",
          title: "JSON Import Failed",
          message: error,
          metadata: bgJob.metadata,
          error,
          timestamp: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Bulk import failed" });
  }
};

// ─── Shared enums & helpers (used by both JSON normalizer and CSV parser) ─────

const SKILL_LEVELS   = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
const LANG_LEVELS    = ["Basic", "Conversational", "Fluent", "Native"] as const;
const AVAIL_STATUSES = ["Available", "Open to Opportunities", "Not Available"] as const;
const AVAIL_TYPES    = ["Full-time", "Part-time", "Contract", "Freelance"] as const;

function matchEnum<T extends string>(val: string | undefined, opts: readonly T[], fallback: T): T {
  if (!val) return fallback;
  const v = val.toLowerCase().trim();
  return opts.find(o => o.toLowerCase() === v) ?? fallback;
}

function tryParseJSON<T>(raw: string, fallback: T): T {
  const t = raw?.trim();
  if (!t || (!t.startsWith("[") && !t.startsWith("{"))) return fallback;
  try { return JSON.parse(t) as T; } catch { return fallback; }
}

// ─── JSON profile normalizer ──────────────────────────────────────────────────
// Handles mixed formats: flat availability fields, skills/languages as strings,
// certifications as the string "[]", and non-enum availabilityType values.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeJSONProfile(profile: any): any {
  const p = { ...profile };

  // Parse skills/languages if they arrived as strings
  if (typeof p.skills === "string") p.skills = parseSkills(p.skills);
  if (typeof p.languages === "string") p.languages = parseLanguages(p.languages);

  // certifications may come as the literal string "[]"
  if (typeof p.certifications === "string") p.certifications = parseCertifications(p.certifications);
  if (typeof p.experience === "string")     p.experience     = parseExperience(p.experience);
  if (typeof p.education === "string")      p.education      = parseEducation(p.education);
  if (typeof p.projects === "string")       p.projects       = parseProjects(p.projects);

  // Flatten availability object from top-level fields if needed
  if (!p.availability) {
    p.availability = {
      status: matchEnum(p.availabilityStatus, AVAIL_STATUSES, "Available"),
      type:   matchEnum(p.availabilityType,   AVAIL_TYPES,    "Full-time"),
      ...(p.availabilityStartDate ? { preferredStartDate: p.availabilityStartDate } : {}),
    };
  } else {
    // Normalize enum values inside an existing availability object
    p.availability = {
      ...p.availability,
      status: matchEnum(p.availability.status, AVAIL_STATUSES, "Available"),
      type:   matchEnum(p.availability.type,   AVAIL_TYPES,    "Full-time"),
    };
  }
  delete p.availabilityStatus;
  delete p.availabilityType;
  delete p.availabilityStartDate;

  // Flatten socialLinks from top-level fields if needed
  if (!p.socialLinks && (p.linkedin || p.github || p.portfolio)) {
    p.socialLinks = {
      ...(p.linkedin  ? { linkedin:  p.linkedin  } : {}),
      ...(p.github    ? { github:    p.github    } : {}),
      ...(p.portfolio ? { portfolio: p.portfolio } : {}),
    };
    delete p.linkedin; delete p.github; delete p.portfolio;
  }

  return p;
}

// ─── CSV field parsers ────────────────────────────────────────────────────────

// Skills: "Python:Expert:5; JS:Advanced:3"  OR  JSON array
function parseSkills(raw: string) {
  if (!raw?.trim()) return [];
  const arr = tryParseJSON<unknown[]>(raw, []);
  if (arr.length) return arr;
  return raw.split(/[;|]/).map(s => s.trim()).filter(Boolean).map(s => {
    const [name, level, yrs] = s.split(":").map(p => p.trim());
    return { name, level: matchEnum(level, SKILL_LEVELS, "Intermediate"), yearsOfExperience: parseInt(yrs) || 1 };
  });
}

// Languages: "English:Native; French:Conversational"  OR  JSON array
function parseLanguages(raw: string) {
  if (!raw?.trim()) return [];
  const arr = tryParseJSON<unknown[]>(raw, []);
  if (arr.length) return arr;
  return raw.split(/[;|]/).map(s => s.trim()).filter(Boolean).map(s => {
    const [name, proficiency] = s.split(":").map(p => p.trim());
    return { name, proficiency: matchEnum(proficiency, LANG_LEVELS, "Fluent") };
  });
}

// Experience / Education / Certifications / Projects — expect JSON array in cell
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseExperience(raw: string): any[] {
  const arr = tryParseJSON<unknown[]>(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr.map((e: any) => ({
    company:      e.company || "",
    role:         e.role || "",
    startDate:    e.startDate || e["Start Date"] || "",
    endDate:      e.endDate   || e["End Date"]   || "",
    isCurrent:    !!(e.isCurrent ?? e["Is Current"] ?? false),
    description:  e.description || "",
    technologies: Array.isArray(e.technologies)
      ? e.technologies
      : typeof e.technologies === "string"
        ? e.technologies.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [],
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEducation(raw: string): any[] {
  const arr = tryParseJSON<unknown[]>(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr.map((e: any) => ({
    institution:  e.institution || "",
    degree:       e.degree || "",
    fieldOfStudy: e.fieldOfStudy || e["Field of Study"] || "",
    startYear:    parseInt(e.startYear || e["Start Year"]) || undefined,
    endYear:      parseInt(e.endYear   || e["End Year"])   || undefined,
    gpa:          parseFloat(e.gpa) || undefined,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCertifications(raw: string): any[] {
  const arr = tryParseJSON<unknown[]>(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr.map((c: any) => ({
    name:      c.name || "",
    issuer:    c.issuer || "",
    issueDate: c.issueDate || c["Issue Date"] || "",
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProjects(raw: string): any[] {
  const arr = tryParseJSON<unknown[]>(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr.map((p: any) => ({
    name:         p.name || "",
    description:  p.description || "",
    technologies: Array.isArray(p.technologies)
      ? p.technologies
      : typeof p.technologies === "string"
        ? p.technologies.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [],
    role:      p.role || "",
    link:      p.link || "",
    startDate: p.startDate || p["Start Date"] || "",
    endDate:   p.endDate   || p["End Date"]   || "",
  }));
}

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
    const jobId = getJobId(req);
    if (!jobId) {
      return res.status(400).json({ success: false, error: "jobId is required" });
    }

    const jobExists = await Job.findById(jobId).lean();
    if (!jobExists) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found` });
    }

    const userId = (req as AuthedRequest).user!._id;
    const jobTitle = (jobExists as { title?: string }).title ?? jobId;
    const bgJob = createJob("csv_import", userId, {
      jobId,
      jobTitle,
      rowCount: rows.length,
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: bgJob.id,
        status: "pending",
        message: `Importing ${rows.length} candidate row(s) in the background. You'll be notified when done.`,
      },
    });

    const rowSnapshots = rows.map((row) => ({ ...row }));

    setImmediate(async () => {
      try {
        updateJob(bgJob.id, "running");

        const results: ImportSummary = { created: 0, skipped: 0, errors: [] };

        for (const row of rowSnapshots) {
          const email = row.email || row.Email;
          if (!email) {
            results.errors.push("Row missing email — skipped");
            continue;
          }

          try {
            const r = row; // alias for brevity

            await Candidate.create({
              firstName:  r.firstName  || r.first_name  || r["First Name"]  || "Unknown",
              lastName:   r.lastName   || r.last_name   || r["Last Name"]   || "Unknown",
              email:      email.toLowerCase().trim(),
              phone:      r.phone      || r.Phone       || undefined,
              headline:   r.headline   || r.Headline    || "",
              bio:        r.bio        || r.Bio         || "",
              location:   r.location   || r.Location    || "",
              jobId,
              skills:         parseSkills(r.skills        || r.Skills        || ""),
              languages:      parseLanguages(r.languages   || r.Languages    || ""),
              experience:     parseExperience(r.experience || r.Experience   || ""),
              education:      parseEducation(r.education   || r.Education    || ""),
              certifications: parseCertifications(r.certifications || r.Certifications || ""),
              projects:       parseProjects(r.projects     || r.Projects     || ""),
              availability: {
                status: matchEnum(
                  r.availabilityStatus || r["Availability Status"] || r.availability_status,
                  AVAIL_STATUSES, "Available"
                ),
                type: matchEnum(
                  r.availabilityType || r["Availability Type"] || r.availability_type,
                  AVAIL_TYPES, "Full-time"
                ),
                preferredStartDate: r.availabilityStartDate || r["Availability Start Date"] || r.availability_start_date || undefined,
              },
              socialLinks: {
                linkedin:  r.linkedin  || r.LinkedIn  || undefined,
                github:    r.github    || r.GitHub    || undefined,
                portfolio: r.portfolio || r.Portfolio || undefined,
              },
              source: "csv",
            });
            results.created++;
          } catch (err: unknown) {
            if (isDuplicateKeyError(err)) results.skipped++;
            else results.errors.push(`${email}: ${err instanceof Error ? err.message : "Unknown"}`);
          }
        }

        updateJob(bgJob.id, "done", results);
        sendNotificationToUser(userId, {
          type: "job_update",
          jobId: bgJob.id,
          jobType: "csv_import",
          status: "done",
          title: "CSV Import Complete",
          message: `${results.created} of ${rowSnapshots.length} candidate row(s) imported for "${jobTitle}".${results.errors.length ? ` ${results.errors.length} failed.` : ""}`,
          metadata: bgJob.metadata,
          result: results,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : "CSV/Excel processing failed";
        updateJob(bgJob.id, "failed", undefined, error);
        sendNotificationToUser(userId, {
          type: "job_update",
          jobId: bgJob.id,
          jobType: "csv_import",
          status: "failed",
          title: "CSV Import Failed",
          message: error,
          metadata: bgJob.metadata,
          error,
          timestamp: new Date().toISOString(),
        });
      }
    });
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
