"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, Send, Users, ChevronDown, Trash2,
  CheckCircle2, XCircle, AlertCircle, Eye, Edit3, Loader2, Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailRecipient {
  name: string;
  email: string;
}

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: EmailRecipient[];
  jobTitle?: string;
  context?: "interview" | "shortlist" | "offer" | "rejection" | "general";
}

// ─── Templates ────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string;
  label: string;
  badge: string;
  badgeColor: string;
  subject: string;
  body: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: "interview",
    label: "Interview Invitation",
    badge: "Interview",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    subject: "Interview Invitation – {jobTitle}",
    body: `Dear {name},

We are pleased to inform you that following a thorough review of your application for the {jobTitle} position, you have been selected to proceed to the interview stage.

We would like to schedule a formal interview with you at your earliest convenience. Please reply to this email with your availability over the next 5–7 business days, and we will confirm the details shortly.

The interview will cover:
• Your professional background and experience
• Technical skills relevant to the role
• Cultural fit and team alignment

We look forward to speaking with you and learning more about your qualifications.

Warm regards,
The Talent Acquisition Team`,
  },
  {
    id: "shortlist",
    label: "Shortlist Notification",
    badge: "Shortlisted",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    subject: "Great News – You've Been Shortlisted for {jobTitle}",
    body: `Dear {name},

Congratulations! We are delighted to inform you that after a comprehensive evaluation of all applications received for the {jobTitle} position, you have been shortlisted as one of our top candidates.

Your profile demonstrated exceptional alignment with the requirements for this role, and we are excited about the possibility of you joining our team.

Next steps will be communicated shortly. In the meantime, please feel free to reach out if you have any questions.

Once again, congratulations on this achievement.

Best regards,
The HR Team`,
  },
  {
    id: "offer",
    label: "Offer Letter",
    badge: "Offer",
    badgeColor: "bg-violet-100 text-violet-700 border-violet-200",
    subject: "Formal Job Offer – {jobTitle}",
    body: `Dear {name},

It is with great pleasure that we extend to you this formal offer of employment for the position of {jobTitle}.

Following a thorough selection process, we are confident that your skills, experience, and professional background make you an exceptional fit for our team. We are excited about the value you will bring to our organisation.

Details of the offer will be communicated in a separate formal document. We kindly ask that you review the terms and confirm your acceptance within 5 business days.

Please do not hesitate to contact us should you have any questions or require further clarification.

We look forward to welcoming you to the team.

Warm regards,
Human Resources Department`,
  },
  {
    id: "rejection",
    label: "Rejection Notice",
    badge: "Rejection",
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
    subject: "Update on Your Application – {jobTitle}",
    body: `Dear {name},

Thank you for taking the time to apply for the {jobTitle} position and for your interest in our organisation. We truly appreciate the effort you invested in the application process.

After careful consideration and a thorough review of all applications, we regret to inform you that we will not be moving forward with your candidacy at this time. This decision was not easy, as we received an exceptionally strong pool of applicants.

We encourage you to continue pursuing opportunities that align with your skills and aspirations, and we wish you the very best in your professional journey.

We will keep your profile on file and may reach out should a suitable opportunity arise in the future.

Thank you once again for your interest.

Warm regards,
The HR Team`,
  },
  {
    id: "followup",
    label: "Follow-Up",
    badge: "Follow-Up",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    subject: "Follow-Up on Your Application – {jobTitle}",
    body: `Dear {name},

We hope this message finds you well. We are following up regarding your application for the {jobTitle} position.

We wanted to update you that our review process is still ongoing and appreciate your continued patience. We value your interest in joining our organisation and assure you that each application is being given full consideration.

We expect to have an update for you shortly and will be in touch as soon as a decision has been made.

Thank you again for your interest.

Kind regards,
The HR Team`,
  },
  {
    id: "custom",
    label: "Custom Email",
    badge: "Custom",
    badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
    subject: "",
    body: "",
  },
];

// ─── Send result type ─────────────────────────────────────────────────────────

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function EmailModal({
  isOpen,
  onClose,
  recipients: initialRecipients,
  jobTitle = "the position",
  context,
}: EmailModalProps) {
  const defaultTemplate =
    context === "interview"  ? TEMPLATES[0] :
    context === "shortlist"  ? TEMPLATES[1] :
    context === "offer"      ? TEMPLATES[2] :
    context === "rejection"  ? TEMPLATES[3] :
    TEMPLATES[0];

  function resolveVar(str: string, title: string) {
    return str.replace(/\{jobTitle\}/gi, title);
  }

  const [tab, setTab] = useState<"compose" | "preview">("compose");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(defaultTemplate);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [subject, setSubject] = useState(() => resolveVar(defaultTemplate.subject, jobTitle));
  const [body, setBody] = useState(defaultTemplate.body);
  const [cc, setCc] = useState("");
  const [recipients, setRecipients] = useState<EmailRecipient[]>(initialRecipients);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);

  // Sync recipients and reset compose state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setRecipients(initialRecipients);
      setResults(null);
      setTab("compose");
      const tpl =
        context === "interview" ? TEMPLATES[0] :
        context === "shortlist" ? TEMPLATES[1] :
        context === "offer"     ? TEMPLATES[2] :
        context === "rejection" ? TEMPLATES[3] :
        TEMPLATES[0];
      setSelectedTemplate(tpl);
      setSubject(tpl.subject.replace(/\{jobTitle\}/gi, jobTitle));
      setBody(tpl.body);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const applyTemplate = useCallback((t: EmailTemplate) => {
    setSelectedTemplate(t);
    setSubject(resolveVar(t.subject, jobTitle));
    setBody(t.body);
    setShowTemplateDropdown(false);
  }, [jobTitle]);

  const removeRecipient = (email: string) => {
    setRecipients(prev => prev.filter(r => r.email !== email));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;
    setSending(true);
    setResults(null);

    try {
      const ccList = cc.trim()
        ? cc.split(",").map(e => e.trim()).filter(Boolean)
        : undefined;

      const res = await api.post("/email/send", { recipients, subject, body, cc: ccList });
      setResults(res.data.results as SendResult[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send emails";
      setResults(recipients.map(r => ({ email: r.email, success: false, error: message })));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    setResults(null);
    onClose();
  };

  const getPreviewBody = (recipientName: string) =>
    body.replace(/\{name\}/gi, recipientName).replace(/\{candidateName\}/gi, recipientName);

  const sentCount   = results?.filter(r => r.success).length ?? 0;
  const failedCount = results?.filter(r => !r.success).length ?? 0;
  const allSent     = results !== null && failedCount === 0;
  const canSend     = !!subject.trim() && !!body.trim() && recipients.length > 0 && !sending;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ paddingLeft: "calc(1rem + 240px)" }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Send Email to Candidates</h2>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {recipients.length} recipient{recipients.length !== 1 ? "s" : ""} · {jobTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={sending}
                className="p-2 rounded-xl hover:bg-white/20 text-white/70 hover:text-white transition-all disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Result Banner ── */}
            {results !== null && (
              <div className={cn(
                "flex items-center gap-3 px-5 py-3 border-b flex-shrink-0",
                allSent
                  ? "bg-emerald-50 border-emerald-200"
                  : failedCount > 0 && sentCount === 0
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              )}>
                {allSent
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  : failedCount > 0 && sentCount === 0
                  ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  : <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                <div className="flex-1">
                  <p className={cn("text-sm font-semibold",
                    allSent ? "text-emerald-700"
                    : failedCount > 0 && sentCount === 0 ? "text-red-700"
                    : "text-amber-700"
                  )}>
                    {allSent
                      ? `${sentCount} email${sentCount !== 1 ? "s" : ""} sent successfully`
                      : failedCount > 0 && sentCount === 0
                      ? "Failed to send emails — check SMTP configuration"
                      : `${sentCount} sent, ${failedCount} failed`}
                  </p>
                  {!allSent && failedCount > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Failed: {results.filter(r => !r.success).map(r => r.email).join(", ")}
                    </p>
                  )}
                </div>
                {allSent && (
                  <button
                    onClick={handleClose}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-all"
                  >
                    Done
                  </button>
                )}
              </div>
            )}

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">

              {/* ── Left: Recipients ── */}
              <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs font-bold text-gray-700">
                    Recipients
                  </span>
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {recipients.length}
                  </span>
                </div>

                {/* Recipient List */}
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                  {recipients.length === 0 ? (
                    <div className="text-center py-8 px-3">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No recipients</p>
                    </div>
                  ) : (
                    recipients.map(r => {
                      const result = results?.find(res => res.email === r.email);
                      return (
                        <div
                          key={r.email}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-lg group",
                            result?.success ? "bg-emerald-50"
                              : result?.success === false ? "bg-red-50"
                              : "bg-white hover:bg-gray-100"
                          )}
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-800 truncate">{r.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{r.email}</p>
                          </div>
                          {result?.success === true && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          )}
                          {result?.success === false && (
                            <span title={result.error} className="flex-shrink-0">
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            </span>
                          )}
                          {!result && (
                            <button
                              onClick={() => removeRecipient(r.email)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
                              title="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Right: Compose / Preview ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab bar */}
                <div className="flex items-center gap-1 px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
                  <button
                    onClick={() => setTab("compose")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      tab === "compose"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Compose
                  </button>
                  <button
                    onClick={() => setTab("preview")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      tab === "preview"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>

                  <div className="ml-auto relative">
                    <button
                      onClick={() => setShowTemplateDropdown(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Templates
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {showTemplateDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                          {TEMPLATES.map(t => (
                            <button
                              key={t.id}
                              onClick={() => applyTemplate(t)}
                              className={cn(
                                "w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors",
                                selectedTemplate.id === t.id && "bg-blue-50"
                              )}
                            >
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", t.badgeColor)}>
                                {t.badge}
                              </span>
                              <span className="text-xs font-medium text-gray-700">{t.label}</span>
                              {selectedTemplate.id === t.id && (
                                <CheckCircle2 className="w-3 h-3 text-blue-500 ml-auto" />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {tab === "compose" ? (
                    <div className="p-4 space-y-3">
                      {/* Subject */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Subject <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                          placeholder="Email subject..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                        />
                      </div>

                      {/* CC */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          CC <span className="text-gray-400 font-normal">(comma-separated)</span>
                        </label>
                        <input
                          type="text"
                          value={cc}
                          onChange={e => setCc(e.target.value)}
                          placeholder="hr@company.com, director@company.com"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                        />
                      </div>

                      {/* Body */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-600">
                            Message <span className="text-red-400">*</span>
                          </label>
                          <span className="text-[10px] text-gray-400">
                            Use <code className="bg-gray-100 px-1 rounded">{"{name}"}</code> to personalize per recipient
                          </span>
                        </div>
                        <textarea
                          value={body}
                          onChange={e => setBody(e.target.value)}
                          placeholder="Write your email message here..."
                          rows={14}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all resize-none font-sans leading-relaxed"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      {recipients.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">No recipients to preview</p>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-xs text-gray-500 font-medium">
                            Preview how the email appears for each recipient (personalized):
                          </p>
                          {recipients.slice(0, 3).map(r => (
                            <div key={r.email} className="border border-gray-200 rounded-xl overflow-hidden">
                              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
                                  {r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-semibold text-gray-700">{r.name}</span>
                                <span className="text-[10px] text-gray-400">&lt;{r.email}&gt;</span>
                              </div>
                              <div className="px-4 py-2 bg-white">
                                <p className="text-xs font-semibold text-gray-700">
                                  Subject: <span className="font-normal text-gray-600">{subject}</span>
                                </p>
                              </div>
                              <div className="px-4 py-3 bg-white border-t border-gray-100">
                                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                                  {getPreviewBody(r.name)}
                                </pre>
                              </div>
                            </div>
                          ))}
                          {recipients.length > 3 && (
                            <p className="text-xs text-gray-400 text-center py-2">
                              +{recipients.length - 3} more recipients will receive personalized versions
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
                    </span>
                    {recipients.length > 1 && (
                      <span className="text-gray-400">· Each receives a personalized copy</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClose}
                      disabled={sending}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!canSend || (results !== null && allSent)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm",
                        canSend && !(results !== null && allSent)
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
                          : "bg-gray-300 cursor-not-allowed"
                      )}
                    >
                      {sending ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                      ) : results !== null && allSent ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Sent!</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Send {recipients.length > 1 ? `to ${recipients.length}` : "Email"}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sending overlay */}
            <AnimatePresence>
              {sending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl"
                >
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Sending Emails</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Delivering to {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}...
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
