import nodemailer from "nodemailer";

export interface EmailRecipient {
  name: string;
  email: string;
}

export interface SendEmailOptions {
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  cc?: string[];
  replyTo?: string;
}

export interface EmailResult {
  email: string;
  success: boolean;
  error?: string;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

function personalizeBody(body: string, name: string): string {
  return body.replace(/\{name\}/gi, name).replace(/\{candidateName\}/gi, name);
}

export async function sendEmails(options: SendEmailOptions): Promise<EmailResult[]> {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error(
      "Email service is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment variables."
    );
  }

  const fromName = process.env.EMAIL_FROM_NAME || "TalentAI HR System";
  const fromAddress = process.env.SMTP_USER!;
  const from = `"${fromName}" <${fromAddress}>`;

  const results: EmailResult[] = [];

  for (const recipient of options.recipients) {
    try {
      const personalizedBody = personalizeBody(options.body, recipient.name);

      await transporter.sendMail({
        from,
        to: `"${recipient.name}" <${recipient.email}>`,
        subject: options.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <div style="background: #1e40af; padding: 20px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; font-size: 18px; margin: 0; font-weight: 600;">TalentAI</h1>
              <p style="color: #93c5fd; font-size: 12px; margin: 4px 0 0;">HR Management System</p>
            </div>
            <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none;">
              <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: #374151;">
                ${personalizedBody.replace(/\n/g, "<br/>")}
              </div>
            </div>
            <div style="background: #f9fafb; padding: 16px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                This email was sent via TalentAI HR System. Please do not reply directly to this email.
              </p>
            </div>
          </div>`,
        text: personalizedBody,
        cc: options.cc,
        replyTo: options.replyTo || fromAddress,
      });

      results.push({ email: recipient.email, success: true });
    } catch (err: unknown) {
      results.push({
        email: recipient.email,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
