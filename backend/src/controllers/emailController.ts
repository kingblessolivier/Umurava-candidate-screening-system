import { Request, Response } from "express";
import { sendEmails, EmailRecipient } from "../services/emailService";
import { z } from "zod";

const SendEmailSchema = z.object({
  recipients: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })).min(1, "At least one recipient is required"),
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Email body is required"),
  cc: z.array(z.string().email()).optional(),
  replyTo: z.string().email().optional(),
});

export async function sendEmailHandler(req: Request, res: Response) {
  const parsed = SendEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
  }

  const { recipients, subject, body, cc, replyTo } = parsed.data;

  try {
    const results = await sendEmails({ recipients, subject, body, cc, replyTo });

    const sent    = results.filter(r => r.success).length;
    const failed  = results.filter(r => !r.success).length;

    return res.json({
      message: `${sent} email(s) sent${failed > 0 ? `, ${failed} failed` : ""}`,
      sent,
      failed,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send emails";
    return res.status(500).json({ error: message });
  }
}
