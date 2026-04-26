"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, Send, Users, Trash2,
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

interface EmailTemplate {
  id: string;
  label: string;
  badge: string;
  color: string;
  subject: string;
  body: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: "interview",
    label: "Interview",
    badge: "Interview",
    color: "blue",
    subject: "Interview Invitation – {jobTitle}",
    body: `Dear {name},

We are pleased to inform you that following a thorough review of your application for the {jobTitle} position, you have been selected to proceed to the interview stage.

We would like to schedule a formal interview at your earliest convenience. Please reply with your availability over the next 5–7 business days and we will confirm the details shortly.

The interview will cover:
• Your professional background and experience
• Technical skills relevant to the role
• Cultural fit and team alignment

We look forward to speaking with you.

Warm regards,
The Talent Acquisition Team`,
  },
  {
    id: "shortlist",
    label: "Shortlisted",
    badge: "Shortlisted",
    color: "emerald",
    subject: "Great News – You've Been Shortlisted for {jobTitle}",
    body: `Dear {name},

Congratulations! After a comprehensive evaluation of all applications for the {jobTitle} position, you have been shortlisted as one of our top candidates.

Your profile demonstrated exceptional alignment with the requirements for this role, and we are excited about the possibility of you joining our team.

Next steps will be communicated shortly. Please feel free to reach out if you have any questions.

Best regards,
The HR Team`,
  },
  {
    id: "offer",
    label: "Offer",
    badge: "Offer",
    color: "violet",
    subject: "Formal Job Offer – {jobTitle}",
    body: `Dear {name},

It is with great pleasure that we extend to you this formal offer of employment for the position of {jobTitle}.

Following a thorough selection process, we are confident that your skills and experience make you an exceptional fit for our team.

Details of the offer will be communicated in a separate formal document. We kindly ask that you review the terms and confirm your acceptance within 5 business days.

We look forward to welcoming you to the team.

Warm regards,
Human Resources Department`,
  },
  {
    id: "rejection",
    label: "Regret",
    badge: "Regret",
    color: "rose",
    subject: "Update on Your Application – {jobTitle}",
    body: `Dear {name},

Thank you for taking the time to apply for the {jobTitle} position and for your interest in our organisation.

After careful consideration and a thorough review of all applications, we regret to inform you that we will not be moving forward with your candidacy at this time. This was a difficult decision, as we received an exceptionally strong pool of applicants.

We encourage you to continue pursuing opportunities that align with your skills, and we wish you the very best in your professional journey. We will keep your profile on file for future openings.

Thank you once again for your interest.

Warm regards,
The HR Team`,
  },
  {
    id: "followup",
    label: "Follow-Up",
    badge: "Follow-Up",
    color: "amber",
    subject: "Follow-Up on Your Application – {jobTitle}",
    body: `Dear {name},

We hope this message finds you well. We are following up regarding your application for the {jobTitle} position.

Our review process is still ongoing and we appreciate your continued patience. We value your interest and assure you that each application is being given full consideration.

We expect to have an update for you shortly.

Kind regards,
The HR Team`,
  },
  {
    id: "custom",
    label: "Custom",
    badge: "Custom",
    color: "gray",
    subject: "",
    body: "",
  },
];

const TEMPLATE_COLORS: Record<string, { pill: string; active: string }> = {
  blue:   { pill: "border-blue-200 text-blue-700 bg-blue-50",   active: "bg-blue-600 text-white border-blue-600" },
  emerald:{ pill: "border-emerald-200 text-emerald-700 bg-emerald-50", active: "bg-emerald-600 text-white border-emerald-600" },
  violet: { pill: "border-violet-200 text-violet-700 bg-violet-50", active: "bg-violet-600 text-white border-violet-600" },
  rose:   { pill: "border-rose-200 text-rose-700 bg-rose-50",   active: "bg-rose-600 text-white border-rose-600" },
  amber:  { pill: "border-amber-200 text-amber-700 bg-amber-50", active: "bg-amber-600 text-white border-amber-600" },
  gray:   { pill: "border-gray-200 text-gray-600 bg-gray-50",   active: "bg-gray-700 text-white border-gray-700" },
};

interface SendResult { email: string; success: boolean; error?: string; }

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function EmailModal({ isOpen, onClose, recipients: initialRecipients, jobTitle = "the position", context }: EmailModalProps) {
  const defaultTemplate =
    context === "interview" ? TEMPLATES[0] :
    context === "shortlist" ? TEMPLATES[1] :
    context === "offer"     ? TEMPLATES[2] :
    context === "rejection" ? TEMPLATES[3] :
    TEMPLATES[0];

  function resolveVars(str: string, name = "") {
    return str
      .replace(/\{jobTitle\}/gi, jobTitle)
      .replace(/\{job[\s_]?title\}/gi, jobTitle)
      .replace(/\{name\}/gi, name)
      .replace(/\{candidateName\}/gi, name);
  }

  const [tab, setTab] = useState<"compose" | "preview">("compose");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(defaultTemplate);
  const [subject, setSubject] = useState(() => resolveVars(defaultTemplate.subject));
  const [body, setBody] = useState(() => resolveVars(defaultTemplate.body));
  const [cc, setCc] = useState("");
  const [recipients, setRecipients] = useState<EmailRecipient[]>(initialRecipients);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);

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
      setSubject(resolveVars(tpl.subject));
      setBody(resolveVars(tpl.body));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const applyTemplate = useCallback((t: EmailTemplate) => {
    setSelectedTemplate(t);
    setSubject(resolveVars(t.subject));
    setBody(resolveVars(t.body));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTitle]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;
    setSending(true);
    setResults(null);
    try {
      const ccList = cc.trim() ? cc.split(",").map(e => e.trim()).filter(Boolean) : undefined;
      const res = await api.post("/email/send", { recipients, subject, body, cc: ccList });
      setResults(res.data.results as SendResult[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send";
      setResults(recipients.map(r => ({ email: r.email, success: false, error: message })));
    } finally { setSending(false); }
  };

  const handleClose = () => { if (sending) return; setResults(null); onClose(); };

  const sentCount   = results?.filter(r => r.success).length ?? 0;
  const failedCount = results?.filter(r => !r.success).length ?? 0;
  const allSent     = results !== null && failedCount === 0;
  const canSend     = !!subject.trim() && !!body.trim() && recipients.length > 0 && !sending;

  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

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
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="relative w-full max-w-4xl flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            style={{ maxHeight: "90vh" }}
          >

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">New Email</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">{jobTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Compose / Preview toggle */}
                <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 mr-2">
                  <button onClick={() => setTab("compose")}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                      tab === "compose" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                    <Edit3 className="w-3 h-3" /> Compose
                  </button>
                  <button onClick={() => setTab("preview")}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                      tab === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>
                <button onClick={handleClose} disabled={sending}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Result Banner ─────────────────────────────────────────── */}
            {results !== null && (
              <div className={cn("flex items-center gap-3 px-5 py-2.5 border-b flex-shrink-0 text-sm",
                allSent ? "bg-emerald-50 border-emerald-100"
                : sentCount > 0 ? "bg-amber-50 border-amber-100"
                : "bg-red-50 border-red-100")}>
                {allSent
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  : failedCount > 0 && sentCount === 0
                  ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                <p className={cn("text-xs font-semibold flex-1",
                  allSent ? "text-emerald-700" : sentCount > 0 ? "text-amber-700" : "text-red-700")}>
                  {allSent
                    ? `${sentCount} email${sentCount !== 1 ? "s" : ""} delivered successfully`
                    : failedCount > 0 && sentCount === 0
                    ? `Failed to send — ${results[0]?.error ?? "check SMTP settings"}`
                    : `${sentCount} sent · ${failedCount} failed`}
                </p>
                {allSent && (
                  <button onClick={handleClose}
                    className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-lg transition-colors">
                    Close
                  </button>
                )}
              </div>
            )}

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden min-h-0">

              {/* ── Left: Recipients panel ── */}
              <div className="w-56 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/80">
                <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">To</span>
                  <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                    {recipients.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
                  {recipients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
                      <Users className="w-7 h-7 text-gray-200 mb-2" />
                      <p className="text-[11px] text-gray-400">No recipients selected</p>
                    </div>
                  ) : (
                    recipients.map(r => {
                      const res = results?.find(x => x.email === r.email);
                      return (
                        <div key={r.email}
                          className={cn("flex items-center gap-2 px-2 py-1.5 rounded-lg group transition-colors",
                            res?.success ? "bg-emerald-50" : res?.success === false ? "bg-red-50" : "hover:bg-white")}>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {initials(r.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-800 truncate">{r.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{r.email}</p>
                          </div>
                          {res?.success === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                          {res?.success === false && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" title={res.error} />}
                          {!res && (
                            <button onClick={() => setRecipients(p => p.filter(x => x.email !== r.email))}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
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
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* Template Pills */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0 overflow-x-auto">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">Templates:</span>
                  {TEMPLATES.map(t => {
                    const c = TEMPLATE_COLORS[t.color];
                    const isActive = selectedTemplate.id === t.id;
                    return (
                      <button key={t.id} onClick={() => applyTemplate(t)}
                        className={cn("flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                          isActive ? c.active : c.pill + " hover:opacity-80")}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Compose tab */}
                {tab === "compose" && (
                  <div className="flex-1 overflow-y-auto">
                    {/* Email fields */}
                    <div className="border-b border-gray-100">
                      {/* Subject */}
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50">
                        <span className="text-[11px] font-semibold text-gray-400 w-14 flex-shrink-0">Subject</span>
                        <input
                          type="text"
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                          placeholder="Email subject…"
                          className="flex-1 text-sm text-gray-800 placeholder-gray-300 border-0 outline-none bg-transparent font-medium"
                        />
                      </div>
                      {/* CC */}
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-[11px] font-semibold text-gray-400 w-14 flex-shrink-0">CC</span>
                        <input
                          type="text"
                          value={cc}
                          onChange={e => setCc(e.target.value)}
                          placeholder="hr@company.com, ceo@company.com"
                          className="flex-1 text-xs text-gray-600 placeholder-gray-300 border-0 outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Body */}
                    <div className="relative p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-gray-400">
                          Use <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">{"{name}"}</code> to personalise per recipient
                        </span>
                        <span className="text-[10px] text-gray-300">{body.length} chars</span>
                      </div>
                      <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={16}
                        placeholder="Write your message here…"
                        className="w-full text-sm text-gray-700 leading-relaxed placeholder-gray-300 border-0 outline-none bg-transparent resize-none font-sans"
                      />
                    </div>
                  </div>
                )}

                {/* Preview tab */}
                {tab === "preview" && (
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {recipients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-12">
                        <Mail className="w-10 h-10 text-gray-200 mb-3" />
                        <p className="text-sm text-gray-400">No recipients to preview</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-[11px] text-gray-400 font-medium">
                          Showing {Math.min(recipients.length, 3)} of {recipients.length} personalized preview{recipients.length > 1 ? "s" : ""}
                        </p>
                        {recipients.slice(0, 3).map(r => (
                          <div key={r.email} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Email client header */}
                            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/80">
                              <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                  {initials(r.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800">{r.name}</p>
                                  <p className="text-[10px] text-gray-400">{r.email}</p>
                                </div>
                                <span className="text-[10px] text-gray-400">To: {r.email}</span>
                              </div>
                              <div className="space-y-0.5 pl-10">
                                <p className="text-xs text-gray-800">
                                  <span className="text-gray-400 font-medium">Subject: </span>
                                  <span className="font-semibold">{subject}</span>
                                </p>
                                {cc && (
                                  <p className="text-[11px] text-gray-400">
                                    <span className="font-medium">CC: </span>{cc}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Email body */}
                            <div className="px-6 py-5">
                              <pre className="text-[13px] text-gray-700 whitespace-pre-wrap font-sans leading-[1.75]">
                                {resolveVars(body, r.name)}
                              </pre>
                            </div>
                          </div>
                        ))}
                        {recipients.length > 3 && (
                          <div className="text-center py-2">
                            <span className="text-[11px] text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
                              +{recipients.length - 3} more recipients will each receive a personalized copy
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{recipients.length} recipient{recipients.length !== 1 ? "s" : ""}</span>
                    {recipients.length > 1 && <span className="text-gray-300">· personalized per recipient</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleClose} disabled={sending}
                      className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
                      Cancel
                    </button>
                    <button onClick={handleSend} disabled={!canSend || allSent}
                      className={cn("flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-sm",
                        canSend && !allSent
                          ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none")}>
                      {sending
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                        : allSent
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Sent</>
                        : <><Send className="w-3.5 h-3.5" /> Send{recipients.length > 1 ? ` to ${recipients.length}` : ""}</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sending overlay */}
            <AnimatePresence>
              {sending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl">
                  <div className="text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                      <Loader2 className="w-7 h-7 text-white animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Sending…</p>
                      <p className="text-xs text-gray-400 mt-1">Delivering to {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}</p>
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
