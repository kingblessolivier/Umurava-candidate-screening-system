import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  getJob,
  registerSSEClient,
  removeSSEClient,
} from "../services/backgroundJobService";

interface JwtPayload {
  id: string;
  name: string;
  email: string;
}

// GET /notifications/stream?token=<jwt>
// EventSource doesn't support custom headers, so we accept the JWT via query param.
export const streamNotifications = (req: Request, res: Response): void => {
  const token = req.query.token as string;

  if (!token) {
    res.status(401).json({ success: false, error: "Token required" });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    userId = decoded.id;
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  registerSSEClient(userId, res);

  res.write(
    `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`
  );

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeSSEClient(userId, res);
  });
};

// GET /background-jobs/:jobId
export const getJobStatus = (req: Request, res: Response): void => {
  const userId = (req as Request & { user?: { _id: string } }).user?._id;
  const job = getJob(req.params.jobId);

  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" });
    return;
  }
  if (job.userId !== userId) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  res.json({ success: true, data: job });
};
