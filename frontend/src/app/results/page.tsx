"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchResults, deleteResult } from "@/store/screeningSlice";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy, Users, Clock, Zap, ArrowRight, BarChart3, Trash2, Mail,
  Database, Activity, FileText, Sparkles, Filter, Server, Brain,
} from "lucide-react";
import EmailModal from "@/components/email/EmailModal";
import { ScreeningResult } from "@/types";

function scoreColor(s: number): string {
  if (s >= 70) return "#22c55e";
  if (s >= 55) return "#f59e0b";
  return "#ef4444";
}

// ─── System Header ────────────────────────────────────────────────────────────
function SysHeader({ count }: { count: number }) {
  const [clock, setClock] = useState(() => {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}:${n.getSeconds().toString().padStart(2, "0")} UTC`;
  });

  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setClock(`${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}:${n.getSeconds().toString().padStart(2, "0")} UTC`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-9 bg-white border-b border-gray-200 flex items-center px-4 gap-0 flex-shrink-0 select-none">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[11px] font-bold text-gray-900 tracking-widest uppercase">TalentAI</span>
        </div>
        <div className="w-px h-3.5 bg-gray-200" />
        <span className="text-[10px] text-gray-500 tracking-wider uppercase">Screening Results Module</span>
        <div className="w-px h-3.5 bg-gray-200" />
        <span className="text-[10px] text-gray-400 font-mono">REPORT · ARCHIVE</span>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        <span className="text-[10px] font-mono text-gray-400">{clock}</span>
        <div className="w-px h-3.5 bg-gray-200" />
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] font-mono text-green-700 tracking-wider">{count} RESULTS LOADED</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ results }: { results: ScreeningResult[] }) {
  const totalScreened = results.reduce((a, r) => a + (r.totalApplicants || 0), 0);
  const totalShortlisted = results.reduce((a, r) => a + (r.shortlistSize || 0), 0);
  const avgDuration = results.length
    ? (results.reduce((a, r) => a + (r.processingTimeMs || 0), 0) / results.length / 1000).toFixed(1)
    : "0";

  const metrics = [
    { label: "TOTAL SCREENINGS", value: results.length, unit: "", icon: FileText, accent: "#3b82f6" },
    { label: "APPLICANTS PROCESSED", value: totalScreened, unit: "", icon: Database, accent: "#6b7280" },
    { label: "SHORTLISTED", value: totalShortlisted, unit: "", icon: Trophy, accent: "#16a34a" },
    { label: "AVG DURATION", value: avgDuration, unit: "s", icon: Clock, accent: "#d97706" },
  ];

  return (
    <div className="bg-white border-b border-gray-200 flex items-stretch flex-shrink-0">
      {metrics.map(({ label, value, unit, icon: Icon, accent }, i) => (
        <React.Fragment key={label}>
          {i > 0 && <div className="w-px bg-gray-200 self-stretch" />}
          <div className="flex-1 px-4 py-2.5 flex items-center gap-2.5 min-w-0">
            <Icon className="w-3 h-3 flex-shrink-0" style={{ color: accent }} />
            <div className="min-w-0">
              <p className="text-[8px] font-semibold uppercase tracking-widest text-gray-500 leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold font-mono leading-none" style={{ color: accent }}>
                {value}{unit}
              </p>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({
  result, onDelete, onEmail,
}: {
  result: ScreeningResult;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onEmail: (e: React.MouseEvent, r: ScreeningResult) => void;
}) {
  const avgScore = result.shortlist?.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.finalScore, 0) / result.shortlist.length)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <div className="bg-white border border-gray-200 overflow-hidden hover:border-blue-300 transition-colors">
        {/* Card Header */}
        <Link href={`/results/${result._id}`} className="block p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-4 bg-blue-500 rounded-sm" />
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {result.jobTitle}
                </h3>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                  <Users className="w-2.5 h-2.5" />
                  <span className="text-gray-700 font-bold">{result.totalApplicants}</span> APPLICANTS
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                  <Trophy className="w-2.5 h-2.5" style={{ color: "#16a34a" }} />
                  <span className="text-gray-700 font-bold">{result.shortlistSize}</span> SHORTLISTED
                </span>
                {result.processingTimeMs && (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                    <Clock className="w-2.5 h-2.5" />
                    <span className="text-gray-700 font-bold">{(result.processingTimeMs / 1000).toFixed(1)}s</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                  <Brain className="w-2.5 h-2.5" style={{ color: "#7c3aed" }} />
                  {result.aiModel?.toUpperCase() || "GEMINI"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {avgScore > 0 && (
                <div className="text-right">
                  <div
                    className="text-lg font-bold font-mono"
                    style={{ color: scoreColor(avgScore) }}
                  >
                    {avgScore}%
                  </div>
                  <p className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">AVG SCORE</p>
                </div>
              )}
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </Link>

        {/* Card Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400">
            <FileText className="w-2.5 h-2.5" />
            <span>{new Date(result.screeningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</span>
            <span className="text-gray-300">·</span>
            <Server className="w-2.5 h-2.5" />
            <span>{result.aiModel?.toUpperCase() || "GEMINI"}</span>
          </div>

          <div className="flex items-center gap-1">
            {result.shortlist?.length > 0 && (
              <button
                onClick={(e) => onEmail(e, result)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
              >
                <Mail className="w-2.5 h-2.5" />
                EMAIL {result.shortlist.length}
              </button>
            )}
            <button
              onClick={(e) => onDelete(result._id || "", e)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete result"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="border border-gray-200 bg-white p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <Trophy className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-bold text-gray-900 mb-1">NO SCREENING RESULTS</p>
      <p className="text-xs text-gray-500 mb-4">Run your first AI screening to see results here</p>
      <Link
        href="/screening"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
      >
        <Zap className="w-3.5 h-3.5" />
        RUN SCREENING
      </Link>
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-4 bg-gray-200 rounded-sm animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
              <div className="flex gap-4">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
              </div>
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { results, loading } = useSelector((s: RootState) => s.screening);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    recipients: { name: string; email: string }[];
    jobTitle: string;
  }>({ open: false, recipients: [], jobTitle: "" });

  const handleEmailShortlisted = (e: React.MouseEvent, result: ScreeningResult) => {
    e.preventDefault();
    if (!result.shortlist?.length) return;
    const recipients = result.shortlist.map(c => ({
      name: c.candidateName?.trim() || c.email.split("@")[0],
      email: c.email,
    }));
    setEmailModal({ open: true, recipients, jobTitle: result.jobTitle });
  };

  useEffect(() => { dispatch(fetchResults()); }, [dispatch]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Delete this screening result?")) return;
    setDeletingId(id);
    try {
      await dispatch(deleteResult(id)).unwrap();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef1f5] font-sans flex flex-col">
      {/* System Header */}
      <SysHeader count={results.length} />

      {/* Stats Bar */}
      <StatsBar results={results} />

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-3">
          {/* Page Title */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                SCREENING RESULTS ARCHIVE
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                {results.length} RECORD{results.length !== 1 ? "S" : ""} FOUND
              </p>
            </div>
            <Link
              href="/analytics"
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              ANALYTICS
            </Link>
          </div>

          {loading ? (
            <LoadingState />
          ) : results.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <ResultCard
                  key={r._id}
                  result={r}
                  onDelete={handleDelete}
                  onEmail={handleEmailShortlisted}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-7 bg-white border-t border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 select-none">
        {[
          { icon: Database, label: "RESULTS", value: `${results.length}` },
          { icon: Activity, label: "STATUS", value: loading ? "LOADING..." : "READY" },
          { icon: Server, label: "ENGINE", value: "GEMINI 2.5 FLASH" },
        ].map(({ icon: Icon, label, value }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="w-px h-3 bg-gray-200" />}
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <Icon className="w-2.5 h-2.5 text-gray-400" />
              <span className="text-gray-400 tracking-wider">{label}:</span>
              <span className="text-gray-500 tracking-wider">{value}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModal.open}
        onClose={() => setEmailModal({ open: false, recipients: [], jobTitle: "" })}
        recipients={emailModal.recipients}
        jobTitle={emailModal.jobTitle}
        context="shortlist"
      />
    </div>
  );
}
