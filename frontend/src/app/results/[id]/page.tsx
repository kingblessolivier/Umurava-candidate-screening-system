"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchResult } from "@/store/screeningSlice";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Clock, ChevronDown, ChevronUp, ChevronRight,
  MessageSquare, CheckCircle, XCircle, AlertTriangle, Shield, Eye,
  TrendingDown, Lightbulb, BarChart3, Download, Check,
  CheckSquare, Square, Sparkles, Filter, Brain, Activity,
  Database, Trophy, FileText, Server,
} from "lucide-react";
import { AIThinkingReviewModal } from "@/components/screening/AIThinkingReviewModal";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  Tooltip, BarChart, Bar, XAxis, YAxis, Cell,
} from "recharts";
import { CandidateScore, RejectedCandidate, ScreeningResult } from "@/types";

// ─── Pipeline ─────────────────────────────────────────────────────────────────
type PipelineStage = "new" | "interview" | "hold" | "offer" | "hired" | "pass";

const PIPELINE: Record<PipelineStage, { label: string; color: string; bg: string; border: string }> = {
  new:       { label: "New",       color: "#64748b", bg: "#1e293b",  border: "#334155" },
  interview: { label: "Interview", color: "#60a5fa", bg: "#1e3a5f",  border: "#2563eb" },
  hold:      { label: "On Hold",   color: "#fbbf24", bg: "#2d1f00",  border: "#d97706" },
  offer:     { label: "Offer",     color: "#a78bfa", bg: "#1e1040",  border: "#7c3aed" },
  hired:     { label: "Hired",     color: "#4ade80", bg: "#052e16",  border: "#16a34a" },
  pass:      { label: "Pass",      color: "#f87171", bg: "#2d0707",  border: "#dc2626" },
};

type RecFilter = "All" | "Strongly Recommended" | "Recommended" | "Consider" | "Not Recommended";
type SortBy    = "score" | "confidence" | "skills";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const REC_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; short: string }> = {
  "Strongly Recommended": { color: "#4ade80", bg: "#052e16", border: "#16a34a33", dot: "#22c55e", short: "STRONG REC." },
  "Recommended":          { color: "#60a5fa", bg: "#0c1e35", border: "#2563eb33", dot: "#3b82f6", short: "RECOMMENDED" },
  "Consider":             { color: "#fbbf24", bg: "#2d1f00", border: "#d9770633", dot: "#f59e0b", short: "CONSIDER"    },
  "Not Recommended":      { color: "#f87171", bg: "#2d0707", border: "#dc262633", dot: "#ef4444", short: "NOT REC."    },
};

function scoreColor(s: number): string {
  if (s >= 80) return "#4ade80";
  if (s >= 65) return "#60a5fa";
  if (s >= 50) return "#fbbf24";
  return "#f87171";
}

const SEVERITY_COLOR: Record<string, string> = { high: "#f87171", medium: "#fbbf24", low: "#94a3b8" };

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function displayName(c: CandidateScore): string {
  if (c.candidateName?.trim()) return c.candidateName;
  return c.email.split("@")[0];
}

function nowClock() {
  const n = new Date();
  return `${n.getHours().toString().padStart(2,"0")}:${n.getMinutes().toString().padStart(2,"0")}:${n.getSeconds().toString().padStart(2,"0")} UTC`;
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
async function exportPDF(candidates: CandidateScore[], jobTitle: string, screeningDate: string) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W        = doc.internal.pageSize.getWidth();
  const H        = doc.internal.pageSize.getHeight();
  const margin   = 18;
  const contentW = W - margin * 2;

  const addHeader = (n: number) => {
    doc.setFillColor(13, 18, 32); doc.rect(0, 0, W, 14, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(96, 165, 250);
    doc.text("TALENTAI — SCREENING REPORT", margin, 9);
    doc.setFont("helvetica", "normal"); doc.setTextColor(107, 114, 128);
    doc.text(`Page ${n}`, W - margin, 9, { align: "right" });
  };
  const addFooter = () => {
    doc.setFontSize(7); doc.setTextColor(75, 85, 99); doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · TalentAI`, margin, H - 8);
    doc.setDrawColor(30, 40, 60); doc.line(margin, H - 12, W - margin, H - 12);
  };

  addHeader(1);
  doc.setFillColor(17, 24, 39); doc.rect(0, 14, W, 80, "F");
  doc.setFillColor(59, 130, 246); doc.rect(0, 14, 4, 80, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(255, 255, 255);
  doc.text("Candidate Screening", margin + 6, 52);
  doc.setTextColor(96, 165, 250); doc.text("Report", margin + 6, 65);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(156, 163, 175);
  doc.text(`Position: ${jobTitle}`, margin + 6, 79); doc.setFontSize(9);
  doc.text(`Date: ${new Date(screeningDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, margin + 6, 87);
  doc.setFillColor(59, 130, 246); doc.roundedRect(W - margin - 46, 50, 46, 22, 4, 4, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(`${candidates.length}`, W - margin - 23, 62, { align: "center" });
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text("SELECTED", W - margin - 23, 68, { align: "center" });

  let y = 110;
  const avg = Math.round(candidates.reduce((a, c) => a + c.finalScore, 0) / candidates.length);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text("Summary", margin, y); y += 6;
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [["Metric", "Value"]],
    body: [["Candidates", `${candidates.length}`], ["Top Score", `${Math.max(...candidates.map(c => c.finalScore))}%`], ["Avg Score", `${avg}%`], ["Position", jobTitle]],
    theme: "plain",
    styles: { fontSize: 9, textColor: [209, 213, 219], cellPadding: 3, fillColor: [17, 24, 39] },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [26, 32, 44] },
    columnStyles: { 0: { fontStyle: "bold", textColor: [156, 163, 175] }, 1: { textColor: [255, 255, 255] } },
  });
  y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
  y += 12;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text("Shortlist Overview", margin, y); y += 6;
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [["Rank", "Candidate", "Score", "Recommendation"]],
    body: candidates.slice(0, 5).map(c => [`#${c.rank}`, displayName(c), `${c.finalScore}%`, c.recommendation]),
    theme: "plain",
    styles: { fontSize: 9, textColor: [209, 213, 219], cellPadding: 3, fillColor: [17, 24, 39] },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [26, 32, 44] },
    columnStyles: { 0: { textColor: [251, 191, 36] }, 2: { textColor: [34, 197, 94] } },
  });
  addFooter();

  candidates.forEach((c, idx) => {
    doc.addPage(); addHeader(idx + 2);
    y = 22;
    doc.setFillColor(17, 24, 39); doc.rect(margin, y, contentW, 28, "F");
    const rc = REC_CONFIG[c.recommendation];
    const [cr, cg, cb] = rc ? hexToRgb(rc.color) : [100, 116, 139];
    doc.setFillColor(cr, cg, cb); doc.rect(margin, y, 3, 28, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text(`#${c.rank}  ${displayName(c)}`, margin + 7, y + 11);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(156, 163, 175);
    doc.text(c.email, margin + 7, y + 19); doc.text(c.recommendation, margin + 7, y + 25);
    const [sr, sg, sb] = hexToRgb(scoreColor(c.finalScore));
    doc.setFillColor(sr, sg, sb); doc.circle(W - margin - 20, y + 14, 10, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text(`${c.finalScore}`, W - margin - 20, y + 15, { align: "center" });
    doc.setFontSize(7); doc.text("/ 100", W - margin - 20, y + 21, { align: "center" });
    y += 36;
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(156, 163, 175);
    const sl = doc.splitTextToSize(c.summary, contentW); doc.text(sl, margin, y); y += sl.length * 5 + 6;
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [["Category", "Score"]],
      body: [["Skills", `${c.breakdown.skillsScore}%`], ["Experience", `${c.breakdown.experienceScore}%`], ["Education", `${c.breakdown.educationScore}%`], ["Projects", `${c.breakdown.projectsScore}%`], ["Availability", `${c.breakdown.availabilityScore}%`], ["TOTAL", `${c.finalScore}%`]],
      theme: "plain",
      styles: { fontSize: 9, textColor: [209, 213, 219], cellPadding: 3, fillColor: [17, 24, 39] },
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [26, 32, 44] },
      didParseCell: (d) => { if (d.row.index === 5) { d.cell.styles.fontStyle = "bold"; d.cell.styles.textColor = [34, 197, 94]; } },
    });
    y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y; y += 8;
    const cw = (contentW - 4) / 2;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.setTextColor(34, 197, 94); doc.text("Strengths", margin, y);
    doc.setTextColor(239, 68, 68); doc.text("Gaps", margin + cw + 4, y); y += 5;
    for (let i = 0; i < Math.min(Math.max(c.strengths.length, c.gaps.length), 4); i++) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(156, 163, 175);
      if (c.strengths[i]) { const l = doc.splitTextToSize(`• ${c.strengths[i]}`, cw - 2); doc.text(l, margin, y); }
      if (c.gaps[i])      { const l = doc.splitTextToSize(`• ${c.gaps[i]}`, cw - 2);      doc.text(l, margin + cw + 4, y); }
      y += 6;
    }
    y += 4;
    if (y < H - 60) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(167, 139, 250);
      doc.text("Interview Questions", margin, y); y += 5;
      c.interviewQuestions.forEach((q, qi) => {
        if (y > H - 30) return;
        const lines = doc.splitTextToSize(`${qi + 1}. ${q}`, contentW);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(209, 213, 219);
        doc.text(lines, margin, y); y += lines.length * 5 + 2;
      });
    }
    addFooter();
  });
  doc.save(`Screening-${jobTitle.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── System chrome components ─────────────────────────────────────────────────

function SysHeader({
  result, selectedIds, onExport, exporting, thinkingLog, onShowThinking,
}: {
  result: ScreeningResult;
  selectedIds: Set<string>;
  onExport: () => void;
  exporting: boolean;
  thinkingLog: { length: number };
  onShowThinking: () => void;
}) {
  const [clock, setClock] = useState(nowClock());
  useEffect(() => {
    const t = setInterval(() => setClock(nowClock()), 1000);
    return () => clearInterval(t);
  }, []);

  const hasThinking = thinkingLog?.length > 0 || (result as ScreeningResult & { thinkingLog?: unknown[] }).thinkingLog?.length;

  return (
    <div className="h-9 bg-[#0d1b2a] border-b border-[#1e3a5f] flex items-center px-4 gap-0 flex-shrink-0 select-none">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]" />
          <span className="text-[11px] font-bold text-[#e2e8f0] tracking-widest uppercase">TalentAI</span>
        </div>
        <div className="w-px h-3.5 bg-[#334155]" />
        <span className="text-[10px] text-[#64748b] tracking-wider uppercase">Screening Results Module</span>
        <div className="w-px h-3.5 bg-[#334155]" />
        <span className="text-[10px] text-[#475569] font-mono">REPORT · FINAL</span>
      </div>

      <div className="flex items-center gap-2">
        {hasThinking && (
          <button
            onClick={onShowThinking}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-[#4c1d95]/50 bg-[#1a0a35] hover:bg-[#2d1060] text-[#a78bfa] text-[10px] font-mono tracking-wider uppercase transition-colors rounded-sm"
          >
            <Brain className="w-3 h-3" />
            AI REASONING
            <span className="ml-0.5 px-1 py-px bg-[#4c1d95]/40 text-[9px] font-bold rounded">
              {typeof thinkingLog?.length === 'number' && thinkingLog.length > 0 ? thinkingLog.length : (result as ScreeningResult & { thinkingLog?: unknown[] }).thinkingLog?.length ?? 0}
            </span>
          </button>
        )}

        {selectedIds.size > 0 && (
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-[#1e4080] bg-[#0a2040] hover:bg-[#0d2a55] text-[#60a5fa] text-[10px] font-mono tracking-wider uppercase transition-colors rounded-sm"
          >
            {exporting
              ? <><Sparkles className="w-3 h-3 animate-spin" /> GENERATING...</>
              : <><Download className="w-3 h-3" /> EXPORT {selectedIds.size} PDF</>}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        <span className="text-[10px] font-mono text-[#475569]">{clock}</span>
        <div className="w-px h-3.5 bg-[#334155]" />
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0d2d0a] border border-[#16a34a]/30 rounded-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span className="text-[10px] font-mono text-[#4ade80] tracking-wider">REPORT LOADED</span>
        </div>
      </div>
    </div>
  );
}

function ReportBanner({ result, onBack }: { result: ScreeningResult; onBack: () => void }) {
  return (
    <div className="bg-[#0f1c2e] border-b border-[#1e3a5f] px-5 py-2.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1 text-[#475569] hover:text-[#94a3b8] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3.5 bg-[#334155]" />
        <Link href="/results" className="text-[10px] font-mono text-[#475569] hover:text-[#94a3b8] tracking-wider uppercase transition-colors">
          RESULTS
        </Link>
        <span className="text-[#334155] text-[10px]">/</span>
        <span className="text-[10px] font-mono text-[#cbd5e1] tracking-wider uppercase truncate max-w-[300px]">{result.jobTitle}</span>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-mono text-[#475569]">
        <span className="flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          {result.totalApplicants} APPLICANTS
        </span>
        <div className="w-px h-3 bg-[#334155]" />
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {new Date(result.screeningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
        </span>
        <div className="w-px h-3 bg-[#334155]" />
        <span className="flex items-center gap-1.5 text-[#4ade80]">
          <Trophy className="w-3 h-3" />
          {result.shortlistSize} SHORTLISTED
        </span>
      </div>
    </div>
  );
}

function IntelStrip({ result }: { result: ScreeningResult }) {
  const avgScore = result.shortlist.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.finalScore, 0) / result.shortlist.length) : 0;
  const avgConf = result.shortlist.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.confidenceScore, 0) / result.shortlist.length) : 0;
  const topScore = result.shortlist[0]?.finalScore ?? 0;

  const metrics = [
    { label: "SCREENED",    value: result.totalApplicants,  unit: "",  icon: Database },
    { label: "SHORTLISTED", value: result.shortlistSize,    unit: "",  icon: Trophy, accent: "#4ade80" },
    { label: "REJECTED",    value: result.rejectedCandidates?.length ?? 0, unit: "", icon: XCircle, accent: "#f87171" },
    { label: "AVG SCORE",   value: avgScore,                unit: "%", icon: Activity, accent: scoreColor(avgScore) },
    { label: "TOP SCORE",   value: topScore,                unit: "%", icon: Sparkles, accent: scoreColor(topScore) },
    { label: "CONFIDENCE",  value: avgConf,                 unit: "%", icon: Shield },
    { label: "DURATION",    value: (result.processingTimeMs / 1000).toFixed(1), unit: "s", icon: Clock },
  ];

  return (
    <div className="bg-[#0a1628] border-b border-[#1e3a5f]/60 flex items-stretch flex-shrink-0">
      {metrics.map(({ label, value, unit, icon: Icon, accent }, i) => (
        <React.Fragment key={label}>
          {i > 0 && <div className="w-px bg-[#1e3a5f]/40 self-stretch" />}
          <div className="flex-1 px-4 py-2.5 flex items-center gap-2.5 min-w-0">
            <Icon className="w-3 h-3 flex-shrink-0" style={{ color: accent ?? "#475569" }} />
            <div className="min-w-0">
              <p className="text-[8px] font-semibold uppercase tracking-widest text-[#475569] leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold font-mono leading-none" style={{ color: accent ?? "#94a3b8" }}>
                {value}{unit}
              </p>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Panel wrapper ─────────────────────────────────────────────────────────────
function SysPanel({
  title, badge, badgeColor, toolbar, children, className = "",
}: {
  title: string; badge?: React.ReactNode; badgeColor?: string;
  toolbar?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex flex-col overflow-hidden border border-[#1e3a5f]/60 rounded-sm ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f1c2e] border-b border-[#1e3a5f]/60 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-4 bg-[#0052cc] rounded-sm" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#cbd5e1]">{title}</span>
          {badge !== undefined && (
            <span
              className="text-[9px] font-bold px-1.5 py-px rounded-sm font-mono"
              style={{ background: `${badgeColor ?? "#0052cc"}20`, color: badgeColor ?? "#60a5fa", border: `1px solid ${badgeColor ?? "#0052cc"}40` }}
            >
              {badge}
            </span>
          )}
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>
      <div className="flex-1 bg-[#0d1b2a] overflow-hidden">{children}</div>
    </div>
  );
}

// ─── Micro components ─────────────────────────────────────────────────────────

function ScoreBar({ value }: { value: number }) {
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 bg-[#1e3a5f] overflow-hidden flex-shrink-0">
        <div className="h-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-bold font-mono tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const cfg = REC_CONFIG[rec] ?? { color: "#94a3b8", bg: "#1e293b", border: "#33415533", dot: "#94a3b8", short: rec };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 font-mono tracking-wider"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.short}
    </span>
  );
}

function ConfTag({ score }: { score: number }) {
  const color = score >= 85 ? "#4ade80" : score >= 65 ? "#fbbf24" : "#f87171";
  const bg    = score >= 85 ? "#052e16" : score >= 65 ? "#2d1f00" : "#2d0707";
  const label = score >= 85 ? "HIGH"    : score >= 65 ? "MED"     : "LOW";
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-px font-mono tracking-wider"
      style={{ background: bg, color, border: `1px solid ${color}33` }}
    >
      <Shield className="w-2 h-2" />{score}% {label}
    </span>
  );
}

function StageSelect({ stage, onChange }: { stage: PipelineStage; onChange: (s: PipelineStage) => void }) {
  const p = PIPELINE[stage];
  return (
    <div className="relative inline-flex">
      <select
        value={stage}
        onChange={e => onChange(e.target.value as PipelineStage)}
        onClick={e => e.stopPropagation()}
        className="appearance-none text-[10px] font-bold font-mono pl-2 pr-5 py-0.5 cursor-pointer focus:outline-none tracking-wider uppercase"
        style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}50` }}
      >
        {(Object.entries(PIPELINE) as [PipelineStage, typeof PIPELINE[PipelineStage]][]).map(([v, s]) => (
          <option key={v} value={v} style={{ background: "#0d1b2a" }}>{s.label}</option>
        ))}
      </select>
      <ChevronDown className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: p.color }} />
    </div>
  );
}

// ─── Candidate detail panel ───────────────────────────────────────────────────
function CandidateDetail({ candidate }: { candidate: CandidateScore }) {
  const [tab, setTab] = useState<"overview" | "interview" | "bias">("overview");

  const radar = [
    { subject: "Skills",     value: candidate.breakdown.skillsScore },
    { subject: "Experience", value: candidate.breakdown.experienceScore },
    { subject: "Education",  value: candidate.breakdown.educationScore },
    { subject: "Projects",   value: candidate.breakdown.projectsScore },
    { subject: "Avail.",     value: candidate.breakdown.availabilityScore },
  ];

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="border-t border-[#1e3a5f]/60 bg-[#070f1a]">
          {/* Sub-nav */}
          <div className="flex border-b border-[#1e3a5f]/60 bg-[#0a1628]">
            <div className="w-9 flex-shrink-0 border-r border-[#1e3a5f]/40" />
            {([
              { id: "overview",  label: "EVALUATION OVERVIEW", icon: BarChart3     },
              { id: "interview", label: "INTERVIEW QUESTIONS",  icon: MessageSquare },
              { id: "bias",      label: "BIAS AUDIT",           icon: Eye           },
            ] as { id: typeof tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold font-mono tracking-wider uppercase border-b-2 transition-colors"
                style={{
                  borderBottomColor: tab === id ? "#0052cc" : "transparent",
                  color: tab === id ? "#60a5fa" : "#475569",
                  background: tab === id ? "#0a1f38" : "transparent",
                }}
              >
                <Icon className="w-3 h-3" />{label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Overview */}
            {tab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  {/* Summary */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#475569] mb-2">EVALUATION SUMMARY</p>
                    <p className="text-xs leading-relaxed text-[#94a3b8] font-mono">{candidate.summary}</p>
                  </div>

                  {/* Score breakdown */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#475569] mb-2">SCORE BREAKDOWN</p>
                    <div className="border border-[#1e3a5f]/60">
                      {[
                        ["SKILLS",       candidate.breakdown.skillsScore      ],
                        ["EXPERIENCE",   candidate.breakdown.experienceScore  ],
                        ["EDUCATION",    candidate.breakdown.educationScore   ],
                        ["PROJECTS",     candidate.breakdown.projectsScore    ],
                        ["AVAILABILITY", candidate.breakdown.availabilityScore],
                      ].map(([label, val], i) => (
                        <div
                          key={label as string}
                          className="flex items-center gap-3 px-3 py-2"
                          style={{ borderTop: i > 0 ? "1px solid #1e3a5f40" : "none", background: i % 2 === 0 ? "#0a1628" : "#070f1a" }}
                        >
                          <span className="text-[10px] font-mono font-bold text-[#475569] w-24 flex-shrink-0">{label}</span>
                          <ScoreBar value={val as number} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths & Gaps */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-[#16a34a]/20 bg-[#052e16]/40">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#4ade80] px-3 py-2 border-b border-[#16a34a]/20">STRENGTHS</p>
                      <ul className="p-3 space-y-1.5">
                        {candidate.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#86efac] font-mono">
                            <span className="text-[#4ade80] flex-shrink-0 mt-px">+</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border border-[#dc2626]/20 bg-[#2d0707]/40">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#f87171] px-3 py-2 border-b border-[#dc2626]/20">GAPS</p>
                      <ul className="p-3 space-y-1.5">
                        {candidate.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#fca5a5] font-mono">
                            <span className="text-[#f87171] flex-shrink-0 mt-px">-</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Skill analysis */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#475569] mb-2">SKILL ANALYSIS</p>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skillGapAnalysis.matched.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 font-mono font-bold"
                          style={{ background: "#052e16", color: "#4ade80", border: "1px solid #16a34a40" }}>✓ {s}</span>
                      ))}
                      {candidate.skillGapAnalysis.missing.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 font-mono font-bold"
                          style={{ background: "#2d0707", color: "#f87171", border: "1px solid #dc262640" }}>✗ {s}</span>
                      ))}
                      {candidate.skillGapAnalysis.bonus.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 font-mono font-bold"
                          style={{ background: "#0c1e35", color: "#60a5fa", border: "1px solid #2563eb40" }}>+ {s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Evaluation notes */}
                  {candidate.reasoning && (
                    <div className="border border-[#1e3a5f]/60">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#475569] px-3 py-2 border-b border-[#1e3a5f]/60 bg-[#0a1628]">EVALUATION NOTES</p>
                      <p className="text-[11px] leading-relaxed text-[#64748b] font-mono p-3">{candidate.reasoning}</p>
                    </div>
                  )}

                  {/* Risk flags */}
                  {candidate.riskFlags?.length > 0 && (
                    <div className="border border-[#d97706]/20">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#fbbf24] px-3 py-2 border-b border-[#d97706]/20 bg-[#2d1f00]/60">RISK FLAGS</p>
                      <div className="p-3 flex flex-wrap gap-1.5">
                        {candidate.riskFlags.map((r, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 font-mono font-bold"
                            style={{ background: `${SEVERITY_COLOR[r.severity]}14`, color: SEVERITY_COLOR[r.severity], border: `1px solid ${SEVERITY_COLOR[r.severity]}30` }}>
                            <AlertTriangle className="w-2.5 h-2.5" />{r.type.replace(/_/g, " ").toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Radar chart */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#475569] mb-3">SCORE PROFILE</p>
                  <div className="border border-[#1e3a5f]/60 bg-[#0a1628] p-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radar}>
                          <PolarGrid stroke="#1e3a5f" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 10 }} />
                          <Radar dataKey="value" stroke="#0052cc" fill="#0052cc" fillOpacity={0.15} strokeWidth={1.5} />
                          <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 2, fontSize: 11, color: "#94a3b8" }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Interview */}
            {tab === "interview" && (
              <div className="space-y-2 max-w-3xl">
                {candidate.interviewQuestions.map((q, i) => (
                  <div key={i} className="flex gap-3 p-3 border border-[#1e3a5f]/60" style={{ background: i % 2 === 0 ? "#0a1628" : "#070f1a" }}>
                    <span className="font-bold text-[#0052cc] font-mono text-sm flex-shrink-0 w-5">{i + 1}.</span>
                    <p className="text-xs font-mono leading-relaxed text-[#94a3b8]">{q}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Bias */}
            {tab === "bias" && (
              <div className="max-w-2xl">
                {candidate.biasFlags?.length > 0 ? (
                  <div className="space-y-2">
                    {candidate.biasFlags.map((b, i) => (
                      <div key={i} className="border border-[#d97706]/30 bg-[#2d1f00]/40">
                        <p className="text-[10px] font-bold font-mono text-[#fbbf24] uppercase tracking-wider px-3 py-2 border-b border-[#d97706]/20">{b.type.replace(/_/g, " ")}</p>
                        <div className="p-3 space-y-1.5">
                          <p className="text-[11px] font-mono text-[#94a3b8]">Signal: {b.signal}</p>
                          <p className="text-[11px] font-mono text-[#60a5fa]">Recommendation: {b.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-4 border border-[#16a34a]/30 bg-[#052e16]/40">
                    <CheckCircle className="w-4 h-4 text-[#4ade80]" />
                    <div>
                      <p className="text-[10px] font-bold font-mono text-[#4ade80] uppercase tracking-wider">NO BIAS SIGNALS DETECTED</p>
                      <p className="text-[11px] font-mono text-[#64748b] mt-0.5">Assessment passed automated bias audit.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Candidate table row ───────────────────────────────────────────────────────
function CandidateRow({
  candidate, isSelected, onSelect, stage, onStageChange, isExpanded, onToggle, index,
}: {
  candidate: CandidateScore; isSelected: boolean; onSelect: (id: string) => void;
  stage: PipelineStage; onStageChange: (id: string, s: PipelineStage) => void;
  isExpanded: boolean; onToggle: (id: string) => void; index: number;
}) {
  const isTop3  = candidate.rank <= 3;
  const rowBg   = isExpanded ? "#0a1f38" : isSelected ? "#0a1a30" : index % 2 === 0 ? "#0d1b2a" : "#070f1a";

  return (
    <>
      <tr
        className="group cursor-pointer transition-colors"
        style={{ borderBottom: "1px solid #1e3a5f40", background: rowBg }}
        onClick={() => onToggle(candidate.candidateId)}
      >
        {/* Checkbox */}
        <td className="pl-4 pr-3 py-3 w-9" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onSelect(candidate.candidateId)}
            className="w-3.5 h-3.5 flex items-center justify-center transition-all flex-shrink-0"
            style={{
              background: isSelected ? "#0052cc" : "transparent",
              border: `1px solid ${isSelected ? "#0052cc" : "#334155"}`,
            }}
          >
            {isSelected && <Check className="w-2 h-2 text-white" />}
          </button>
        </td>

        {/* Rank */}
        <td className="px-3 py-3 w-10">
          <span className="text-xs font-bold font-mono tabular-nums" style={{ color: isTop3 ? "#fbbf24" : "#475569" }}>
            {isTop3 ? `#${candidate.rank}` : `${candidate.rank}`}
          </span>
        </td>

        {/* Candidate */}
        <td className="px-3 py-3">
          <p className="text-xs font-semibold font-mono text-[#e2e8f0]">{displayName(candidate)}</p>
          <p className="text-[10px] font-mono text-[#475569] mt-0.5">{candidate.email}</p>
          <div className="mt-1">
            <ConfTag score={candidate.confidenceScore} />
          </div>
        </td>

        {/* Score */}
        <td className="px-3 py-3 w-32">
          <ScoreBar value={candidate.finalScore} />
        </td>

        {/* Recommendation */}
        <td className="px-3 py-3 w-40">
          <RecBadge rec={candidate.recommendation} />
        </td>

        {/* Stage */}
        <td className="px-3 py-3 w-32" onClick={e => e.stopPropagation()}>
          <StageSelect stage={stage} onChange={s => onStageChange(candidate.candidateId, s)} />
        </td>

        {/* Expand */}
        <td className="pl-2 pr-4 py-3 w-8">
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform"
            style={{ color: "#334155", transform: isExpanded ? "rotate(90deg)" : "none" }}
          />
        </td>
      </tr>

      {isExpanded && <CandidateDetail candidate={candidate} />}
    </>
  );
}

// ─── Rejected row ─────────────────────────────────────────────────────────────
function RejectedRow({ rejected, index }: { rejected: RejectedCandidate; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        style={{ borderBottom: "1px solid #1e3a5f30", background: index % 2 === 0 ? "#0a0d14" : "#070a10" }}
        onClick={() => setOpen(v => !v)}
      >
        <td className="pl-4 pr-3 py-2.5 w-9" />
        <td className="px-3 py-2.5 w-10">
          <span className="text-xs font-bold font-mono tabular-nums text-[#f87171]">{rejected.finalScore}</span>
        </td>
        <td className="px-3 py-2.5">
          <p className="text-xs font-mono text-[#64748b]">{rejected.candidateName || rejected.email.split("@")[0]}</p>
          <p className="text-[10px] font-mono text-[#334155] mt-0.5">{rejected.email}</p>
        </td>
        <td className="px-3 py-2.5 w-32">
          <ScoreBar value={rejected.finalScore} />
        </td>
        <td className="px-3 py-2.5 w-40">
          <span className="text-[10px] font-mono text-[#475569]">
            -{Math.round(rejected.closestShortlistScore - rejected.finalScore)} PTS FROM CUTOFF
          </span>
        </td>
        <td className="px-3 py-2.5 w-32" />
        <td className="pl-2 pr-4 py-2.5 w-8">
          <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ color: "#334155", transform: open ? "rotate(90deg)" : "none" }} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="border-t border-[#dc2626]/20 bg-[#0d0505] p-4 space-y-4">
              <div className="border border-[#dc2626]/20 bg-[#150808]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#f87171] px-3 py-2 border-b border-[#dc2626]/20 flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3" /> REJECTION REASON
                </p>
                <p className="text-[11px] font-mono leading-relaxed text-[#94a3b8] p-3">{rejected.whyNotSelected}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {rejected.topMissingSkills?.length > 0 && (
                  <div className="border border-[#dc2626]/20">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#f87171] px-3 py-2 border-b border-[#dc2626]/20 bg-[#150808]">MISSING SKILLS</p>
                    <div className="p-3 flex flex-wrap gap-1">
                      {rejected.topMissingSkills.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 font-mono font-bold"
                          style={{ background: "#2d0707", color: "#f87171", border: "1px solid #dc262640" }}>✗ {s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {rejected.improvementSuggestions?.length > 0 && (
                  <div className="border border-[#1e3a5f]/40">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#60a5fa] px-3 py-2 border-b border-[#1e3a5f]/40 bg-[#0a1628] flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> IMPROVEMENT AREAS
                    </p>
                    <ul className="p-3 space-y-1">
                      {rejected.improvementSuggestions.map((s, i) => (
                        <li key={i} className="text-[11px] font-mono flex items-start gap-1.5 text-[#64748b]">
                          <span className="text-[#0052cc]">→</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Analytics sidebar ─────────────────────────────────────────────────────────
function AnalyticsSidebar({ result }: { result: ScreeningResult }) {
  const dist    = result.aggregateInsights?.scoreDistribution.filter(d => d.count > 0) ?? [];
  const avgScore = result.shortlist.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.finalScore, 0) / result.shortlist.length) : 0;

  function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="border border-[#1e3a5f]/60 overflow-hidden">
        <div className="px-3 py-2 bg-[#0f1c2e] border-b border-[#1e3a5f]/60 flex items-center gap-2">
          <div className="w-1 h-3 bg-[#0052cc]" />
          <span className="text-[9px] font-bold tracking-widest uppercase text-[#cbd5e1]">{title}</span>
        </div>
        <div className="bg-[#0a1628] p-3">{children}</div>
      </div>
    );
  }

  function DataRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-[#1e3a5f]/30 last:border-0">
        <span className="text-[10px] font-mono text-[#475569] uppercase tracking-wider">{label}</span>
        <span className="text-[11px] font-bold font-mono" style={{ color: accent ?? "#94a3b8" }}>{value}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SidePanel title="COHORT ANALYTICS">
        <DataRow label="SCREENED"    value={result.totalApplicants} />
        <DataRow label="SHORTLISTED" value={result.shortlistSize} accent="#4ade80" />
        <DataRow label="REJECTED"    value={result.rejectedCandidates?.length ?? 0} accent="#f87171" />
        <DataRow label="AVG SCORE"   value={`${avgScore}%`} accent={scoreColor(avgScore)} />
        <DataRow label="TOP SCORE"   value={`${result.shortlist[0]?.finalScore ?? 0}%`} accent={scoreColor(result.shortlist[0]?.finalScore ?? 0)} />
        <DataRow label="DURATION"    value={`${(result.processingTimeMs / 1000).toFixed(1)}s`} />
      </SidePanel>

      {result.aggregateInsights?.recommendationBreakdown && (
        <SidePanel title="RECOMMENDATION DIST.">
          <div className="space-y-3">
            {Object.entries(result.aggregateInsights.recommendationBreakdown).map(([rec, count]) => {
              const cfg = REC_CONFIG[rec];
              if (!cfg) return null;
              const pct = Math.round((count / (result.shortlistSize || 1)) * 100);
              return (
                <div key={rec}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold font-mono tracking-wider" style={{ color: cfg.color }}>{cfg.short}</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: cfg.color }}>{count}</span>
                  </div>
                  <div className="h-1 bg-[#1e3a5f] overflow-hidden">
                    <motion.div
                      className="h-full"
                      style={{ background: cfg.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SidePanel>
      )}

      {dist.length > 0 && (
        <SidePanel title="SCORE DISTRIBUTION">
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist} barSize={16}>
                <XAxis dataKey="range" tick={{ fill: "#475569", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 2, fontSize: 10, color: "#94a3b8" }}
                  formatter={(v: number) => [`${v} candidates`]}
                />
                <Bar dataKey="count" radius={[1, 1, 0, 0]}>
                  {dist.map((e, i) => {
                    const [lo] = e.range.split("-").map(Number);
                    return <Cell key={i} fill={lo >= 80 ? "#16a34a" : lo >= 65 ? "#0052cc" : lo >= 50 ? "#d97706" : "#475569"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SidePanel>
      )}

      {result.aggregateInsights?.commonGaps?.length > 0 && (
        <SidePanel title="COMMON SKILL GAPS">
          <div className="flex flex-wrap gap-1">
            {result.aggregateInsights.commonGaps.slice(0, 8).map(g => (
              <span
                key={g.skill}
                className="text-[9px] px-1.5 py-0.5 font-mono font-bold"
                style={{ background: "#2d0707", color: "#f87171", border: "1px solid #dc262640" }}
              >
                {g.skill.toUpperCase()} ({g.missingCount})
              </span>
            ))}
          </div>
        </SidePanel>
      )}

    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ResultDetailPage() {
  const dispatch = useDispatch<AppDispatch>();
  const params   = useParams();
  const id       = params.id as string;
  const { current: result, loading, thinkingLog } = useSelector((s: RootState) => s.screening);

  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [filter, setFilter]             = useState<RecFilter>("All");
  const [sortBy, setSortBy]             = useState<SortBy>("score");
  const [stages, setStages]             = useState<Record<string, PipelineStage>>({});
  const [showThinkingModal, setShowThinkingModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    try { const s = localStorage.getItem(`pipeline-${id}`); if (s) setStages(JSON.parse(s)); } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { if (id) dispatch(fetchResult(id)); }, [id, dispatch]);

  const updateStage = (cid: string, stage: PipelineStage) => {
    setStages(prev => {
      const next = { ...prev, [cid]: stage };
      try { localStorage.setItem(`pipeline-${id}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleSelect = (cid: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });
  const toggleAll    = () => { if (!result) return; setSelectedIds(selectedIds.size === result.shortlist.length ? new Set() : new Set(result.shortlist.map(c => c.candidateId))); };
  const toggleExpand = (cid: string) => setExpandedId(prev => prev === cid ? null : cid);

  const filtered = useMemo(() => {
    if (!result) return [];
    let list = filter === "All" ? result.shortlist : result.shortlist.filter(c => c.recommendation === filter);
    return [...list].sort((a, b) => {
      if (sortBy === "confidence") return b.confidenceScore - a.confidenceScore;
      if (sortBy === "skills")     return b.breakdown.skillsScore - a.breakdown.skillsScore;
      return b.finalScore - a.finalScore;
    });
  }, [result, filter, sortBy]);

  const handleExport = async () => {
    if (!result) return;
    const candidates = result.shortlist.filter(c => selectedIds.has(c.candidateId));
    if (!candidates.length) return;
    setExporting(true);
    try { await exportPDF(candidates, result.jobTitle, result.screeningDate); setSelectedIds(new Set()); }
    catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !result) {
    return (
      <div className="min-h-screen bg-[#040d18] flex flex-col">
        {/* Skeleton header */}
        <div className="h-9 bg-[#0d1b2a] border-b border-[#1e3a5f] flex items-center px-4 gap-3">
          <div className="w-2 h-2 rounded-full bg-[#334155] animate-pulse" />
          <div className="w-32 h-2 bg-[#1e3a5f] rounded animate-pulse" />
          <div className="w-px h-3.5 bg-[#334155]" />
          <div className="w-48 h-2 bg-[#1e3a5f] rounded animate-pulse" />
        </div>
        <div className="bg-[#0f1c2e] border-b border-[#1e3a5f] h-10" />
        <div className="bg-[#0a1628] border-b border-[#1e3a5f]/60 h-12" />
        <div className="flex-1 p-5 space-y-4">
          <div className="h-8 bg-[#0d1b2a] border border-[#1e3a5f]/40 animate-pulse" />
          <div className="h-80 bg-[#0d1b2a] border border-[#1e3a5f]/40 animate-pulse" />
        </div>
        <div className="h-7 bg-[#0d1b2a] border-t border-[#1e3a5f]" />
      </div>
    );
  }

  const allSelected  = result.shortlist.length > 0 && selectedIds.size === result.shortlist.length;
  const REC_FILTERS: RecFilter[] = ["All", "Strongly Recommended", "Recommended", "Consider", "Not Recommended"];

  const effectiveThinkingLog = thinkingLog?.length ? thinkingLog : (result.thinkingLog ?? []);

  return (
    <div className="min-h-screen bg-[#040d18] flex flex-col">
      {/* System header */}
      <SysHeader
        result={result}
        selectedIds={selectedIds}
        onExport={handleExport}
        exporting={exporting}
        thinkingLog={effectiveThinkingLog}
        onShowThinking={() => setShowThinkingModal(true)}
      />

      {/* Report banner */}
      <ReportBanner result={result} onBack={() => window.history.back()} />

      {/* Intel strip */}
      <IntelStrip result={result} />

      {/* Main content */}
      <div className="flex-1 p-4 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e3a5f transparent" }}>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_256px] gap-4 items-start max-w-[1600px] mx-auto">

          {/* Candidate Registry */}
          <SysPanel
            title="CANDIDATE REGISTRY"
            badge={`${filtered.length} RECORDS`}
            toolbar={
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  className="text-[10px] font-mono font-bold px-2 py-1 bg-[#0a1628] border border-[#1e3a5f] text-[#94a3b8] focus:outline-none uppercase tracking-wider"
                >
                  <option value="score">SORT: SCORE</option>
                  <option value="confidence">SORT: CONFIDENCE</option>
                  <option value="skills">SORT: SKILLS</option>
                </select>
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 border border-[#1e3a5f] bg-[#0a1628] text-[#64748b] hover:text-[#94a3b8] transition-colors uppercase tracking-wider"
                >
                  {allSelected ? <><CheckSquare className="w-3 h-3" /> DESELECT</> : <><Square className="w-3 h-3" /> SELECT ALL</>}
                </button>
              </div>
            }
          >
            {/* Filter bar */}
            <div className="flex items-center gap-px px-4 py-2 border-b border-[#1e3a5f]/40 bg-[#070f1a] flex-wrap">
              {REC_FILTERS.map(f => {
                const count = f === "All" ? result.shortlist.length : result.shortlist.filter(c => c.recommendation === f).length;
                const cfg   = REC_CONFIG[f];
                const active = filter === f;
                if (count === 0 && f !== "All") return null;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="text-[10px] font-bold font-mono px-3 py-1 tracking-wider uppercase transition-colors"
                    style={{
                      background: active ? (cfg ? cfg.bg : "#1e293b") : "transparent",
                      color:      active ? (cfg ? cfg.color : "#94a3b8") : "#334155",
                      borderBottom: `2px solid ${active ? (cfg ? cfg.color : "#0052cc") : "transparent"}`,
                    }}
                  >
                    {f === "All" ? "ALL" : (cfg?.short ?? f)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e3a5f60", background: "#050d18" }}>
                    <th className="pl-4 pr-3 py-2.5 w-9" />
                    <th className="px-3 py-2.5 w-10 text-left text-[9px] font-bold uppercase tracking-widest text-[#334155] font-mono">RNK</th>
                    <th className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#334155] font-mono">CANDIDATE</th>
                    <th className="px-3 py-2.5 w-32 text-left text-[9px] font-bold uppercase tracking-widest text-[#334155] font-mono">SCORE</th>
                    <th className="px-3 py-2.5 w-40 text-left text-[9px] font-bold uppercase tracking-widest text-[#334155] font-mono">DECISION</th>
                    <th className="px-3 py-2.5 w-32 text-left text-[9px] font-bold uppercase tracking-widest text-[#334155] font-mono">PIPELINE</th>
                    <th className="pl-2 pr-4 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <CandidateRow
                      key={c.candidateId}
                      candidate={c}
                      index={i}
                      isSelected={selectedIds.has(c.candidateId)}
                      onSelect={toggleSelect}
                      stage={stages[c.candidateId] ?? "new"}
                      onStageChange={updateStage}
                      isExpanded={expandedId === c.candidateId}
                      onToggle={toggleExpand}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Not shortlisted */}
            {result.rejectedCandidates?.length > 0 && (
              <>
                <button
                  onClick={() => setShowRejected(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest border-t border-[#1e3a5f]/60 transition-colors"
                  style={{ background: showRejected ? "#0a0d14" : "#070a10", color: "#475569" }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3 h-3 text-[#f87171]" />
                    <span className="text-[#64748b]">NOT SHORTLISTED</span>
                    <span className="px-1.5 py-px text-[9px] font-mono font-bold" style={{ background: "#2d0707", color: "#f87171", border: "1px solid #dc262640" }}>
                      {result.rejectedCandidates.length}
                    </span>
                  </div>
                  {showRejected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <AnimatePresence>
                  {showRejected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <table className="w-full" style={{ borderCollapse: "collapse" }}>
                        <tbody>
                          {result.rejectedCandidates.map((r, i) => (
                            <RejectedRow key={r.candidateId} rejected={r} index={i} />
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </SysPanel>

          {/* Sidebar analytics */}
          <div className="sticky top-0">
            <AnalyticsSidebar result={result} />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-7 bg-[#0d1b2a] border-t border-[#1e3a5f] flex items-center px-4 gap-4 flex-shrink-0 select-none">
        {[
          { icon: Database, label: "RECORDS",  value: `${result.shortlistSize} / ${result.totalApplicants}` },
          { icon: Filter,   label: "FILTER",   value: filter === "All" ? "NONE" : REC_CONFIG[filter]?.short ?? filter },
          { icon: Activity, label: "AVG SCORE",value: `${result.shortlist.length ? Math.round(result.shortlist.reduce((a,c)=>a+c.finalScore,0)/result.shortlist.length) : 0}%` },
          { icon: Server,   label: "ENGINE",   value: "GEMINI 2.5 FLASH" },
        ].map(({ icon: Icon, label, value }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="w-px h-3 bg-[#334155]" />}
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <Icon className="w-2.5 h-2.5 text-[#334155]" />
              <span className="text-[#334155] tracking-wider">{label}:</span>
              <span className="text-[#475569] tracking-wider">{value}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* AI Thinking Review Modal */}
      <AIThinkingReviewModal
        isOpen={showThinkingModal}
        onClose={() => setShowThinkingModal(false)}
        thinkingLog={effectiveThinkingLog}
        jobTitle={result.jobTitle}
        screeningDate={result.screeningDate}
        totalApplicants={result.totalApplicants}
      />
    </div>
  );
}
