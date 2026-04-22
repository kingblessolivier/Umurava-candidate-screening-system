import { Response } from "express";
import crypto from "crypto";

export type JobType = "screening" | "pdf_upload";
export type JobStatus = "pending" | "running" | "done" | "failed";

export interface BackgroundJob {
  id: string;
  type: JobType;
  userId: string;
  status: JobStatus;
  metadata: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SSENotification {
  type: "job_update";
  jobId: string;
  jobType: JobType;
  status: JobStatus;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

// In-memory stores (reset on server restart — fine for a demo/hackathon)
const jobs = new Map<string, BackgroundJob>();
const sseClients = new Map<string, Set<Response>>();

export function createJob(
  type: JobType,
  userId: string,
  metadata: Record<string, unknown>
): BackgroundJob {
  const job: BackgroundJob = {
    id: crypto.randomUUID(),
    type,
    userId,
    status: "pending",
    metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  jobs.set(job.id, job);
  return job;
}

export function updateJob(
  jobId: string,
  status: JobStatus,
  result?: Record<string, unknown>,
  error?: string
): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = status;
  job.updatedAt = new Date();
  if (result !== undefined) job.result = result;
  if (error !== undefined) job.error = error;
}

export function getJob(jobId: string): BackgroundJob | undefined {
  return jobs.get(jobId);
}

export function registerSSEClient(userId: string, res: Response): void {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId)!.add(res);
}

export function removeSSEClient(userId: string, res: Response): void {
  const clients = sseClients.get(userId);
  if (!clients) return;
  clients.delete(res);
  if (clients.size === 0) sseClients.delete(userId);
}

export function sendNotificationToUser(
  userId: string,
  notification: SSENotification
): void {
  const clients = sseClients.get(userId);
  if (!clients?.size) return;
  const payload = `data: ${JSON.stringify(notification)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}
