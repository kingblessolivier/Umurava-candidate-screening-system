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

function buildHtml(body: string): string {
  const year = new Date().getFullYear();
  const lines = body.split("\n").map((l) => `<p style="margin:0 0 10px 0;">${l || "&nbsp;"}</p>`).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>TalentAI</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#eef2f7;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;
                 overflow:hidden;box-shadow:0 8px 32px rgba(30,58,138,0.12);">

          <!-- ── Top accent bar ── -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#1e3a8a 0%,#2563eb 50%,#60a5fa 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── Header ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#2563eb 100%);
                        padding:36px 40px 40px;position:relative;overflow:hidden;">

              <!-- Decorative circles -->
              <div style="position:absolute;top:-30px;right:-30px;width:130px;height:130px;
                          border-radius:50%;background:rgba(255,255,255,0.06);"></div>
              <div style="position:absolute;bottom:-20px;right:60px;width:80px;height:80px;
                          border-radius:50%;background:rgba(255,255,255,0.05);"></div>

              <!-- Logo row -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <!-- Icon box -->
                  <td style="vertical-align:middle;">
                    <div style="width:52px;height:52px;background:rgba(255,255,255,0.18);
                                border-radius:14px;border:1.5px solid rgba(255,255,255,0.28);
                                display:inline-block;text-align:center;line-height:52px;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"
                           viewBox="0 0 24 24" fill="none" stroke="#ffffff"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                           style="display:inline-block;vertical-align:middle;">
                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                        <path d="M20 3v4"/><path d="M22 5h-4"/>
                        <path d="M4 17v2"/><path d="M5 18H3"/>
                      </svg>
                    </div>
                  </td>
                  <!-- Brand name -->
                  <td style="vertical-align:middle;padding-left:16px;">
                    <div style="font-size:26px;font-weight:800;color:#ffffff;
                                letter-spacing:-0.5px;line-height:1.1;">TalentAI</div>
                    <div style="font-size:10px;color:#93c5fd;font-weight:600;
                                letter-spacing:3px;text-transform:uppercase;margin-top:3px;">
                      Smart Screening
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Tagline -->
              <p style="margin:20px 0 0;font-size:13px;color:rgba(255,255,255,0.65);
                         font-style:italic;letter-spacing:0.2px;">
                Intelligent Hiring, Powered by AI
              </p>
            </td>
          </tr>

          <!-- ── Divider with wave feel ── -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#dbeafe,#eff6ff,#dbeafe);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;">
              <div style="font-size:14.5px;line-height:1.85;color:#1f2937;
                           font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                ${lines}
              </div>
            </td>
          </tr>

          <!-- ── Signature strip ── -->
          <tr>
            <td style="background:#f0f7ff;padding:20px 40px;border-top:1px solid #dbeafe;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div style="font-size:13px;color:#1d4ed8;font-weight:700;">TalentAI Team</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Talent Acquisition Department</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <div style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);
                                border-radius:8px;padding:6px 14px;">
                      <span style="font-size:12px;font-weight:700;color:#ffffff;
                                   letter-spacing:0.5px;">TalentAI</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;
                        border-radius:0 0 16px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                      This is an automated message from <strong style="color:#64748b;">TalentAI Smart Screening Platform</strong>.<br/>
                      Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;">
                    <p style="margin:0;font-size:10px;color:#cbd5e1;">
                      &copy; ${year} TalentAI &nbsp;·&nbsp; Smart Screening &nbsp;·&nbsp; All rights reserved
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End card -->

        <!-- Below-card note -->
        <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
          Sent via TalentAI &nbsp;·&nbsp; Powered by AI
        </p>

      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->

</body>
</html>`;
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
        html: buildHtml(personalizedBody),
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
