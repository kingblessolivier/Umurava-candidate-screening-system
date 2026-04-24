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
  const lines = body
    .split("\n")
    .map((l) => `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.8;color:#1f2937;">${l.trim() || "&nbsp;"}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>TalentAI</title>
</head>
<body style="margin:0;padding:0;background-color:#dde8f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#dde8f5;">
  <tr>
    <td align="center" style="padding:36px 16px;">

      <!-- ── Outer card ── -->
      <table width="580" cellpadding="0" cellspacing="0" border="0"
             style="max-width:580px;width:100%;background:#ffffff;
                    border-radius:12px;overflow:hidden;
                    box-shadow:0 6px 30px rgba(30,58,138,0.14);">

        <!-- TOP ACCENT BAR -->
        <tr>
          <td height="5" bgcolor="#2563eb"
              style="background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa);
                     font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- ══ HEADER ══ -->
        <tr>
          <td bgcolor="#1d4ed8"
              style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 60%,#3b82f6 100%);
                     padding:28px 36px 24px;">

            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <!-- Icon cell -->
                <td width="54" valign="middle">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="50" height="50" align="center" valign="middle" bgcolor="#3b82f6"
                          style="background-color:#3b82f6;border-radius:10px;
                                 border:1.5px solid rgba(255,255,255,0.35);">
                        <!-- Four-pointed star sparkle in white -->
                        <span style="font-size:22px;color:#ffffff;line-height:1;
                                     font-family:Arial,sans-serif;">&#10022;</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <!-- Brand name cell -->
                <td valign="middle" style="padding-left:14px;">
                  <div style="font-size:24px;font-weight:900;color:#ffffff;
                               letter-spacing:-0.3px;line-height:1;
                               font-family:Arial,Helvetica,sans-serif;">TalentAI</div>
                  <div style="font-size:9px;color:#bfdbfe;font-weight:700;
                               letter-spacing:3.5px;text-transform:uppercase;
                               margin-top:5px;font-family:Arial,sans-serif;">Smart Screening</div>
                </td>
              </tr>
            </table>

            <!-- Tagline -->
            <p style="margin:18px 0 0;font-size:12px;font-style:italic;
                       color:rgba(255,255,255,0.6);font-family:Arial,sans-serif;">
              Intelligent Hiring, Powered by AI
            </p>
          </td>
        </tr>

        <!-- THIN DIVIDER -->
        <tr>
          <td height="3" bgcolor="#dbeafe"
              style="background-color:#dbeafe;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- ══ BODY ══ -->
        <tr>
          <td style="background-color:#ffffff;padding:36px 36px 28px;">
            <div style="font-family:Arial,Helvetica,sans-serif;">
              ${lines}
            </div>
          </td>
        </tr>

        <!-- ══ SIGNATURE STRIP ══ -->
        <tr>
          <td bgcolor="#eff6ff"
              style="background-color:#eff6ff;padding:18px 36px;
                     border-top:1px solid #dbeafe;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle">
                  <div style="font-size:13px;font-weight:700;color:#1d4ed8;
                               font-family:Arial,sans-serif;">TalentAI Team</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;
                               font-family:Arial,sans-serif;">Talent Acquisition Department</div>
                </td>
                <td align="right" valign="middle">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#1d4ed8"
                          style="background-color:#1d4ed8;border-radius:6px;
                                 padding:6px 14px;">
                        <span style="font-size:12px;font-weight:700;color:#ffffff;
                                     letter-spacing:0.5px;font-family:Arial,sans-serif;">
                          &#10022;&nbsp;TalentAI
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ FOOTER ══ -->
        <tr>
          <td bgcolor="#f8fafc"
              style="background-color:#f8fafc;padding:20px 36px;
                     border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;
                       font-family:Arial,sans-serif;">
              This is an automated message from
              <strong style="color:#64748b;">TalentAI Smart Screening Platform</strong>.
              Please do not reply directly to this email.
            </p>
            <p style="margin:10px 0 0;font-size:10px;color:#cbd5e1;
                       font-family:Arial,sans-serif;">
              &copy; ${year} TalentAI &nbsp;&middot;&nbsp; Smart Screening
              &nbsp;&middot;&nbsp; All rights reserved
            </p>
          </td>
        </tr>

      </table>
      <!-- /card -->

      <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center;
                 font-family:Arial,sans-serif;">
        Sent via TalentAI &nbsp;&middot;&nbsp; Powered by AI
      </p>

    </td>
  </tr>
</table>

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
