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
  CheckSquare, Square, Sparkles, Filter,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  Tooltip, BarChart, Bar, XAxis, YAxis, Cell,
} from "recharts";
import { CandidateScore, RejectedCandidate, ScreeningResult } from "@/types";

// ─── Pipeline ─────────────────────────────────────────────────────────────────
type PipelineStage = "new" | "interview" | "hold" | "offer" | "hired" | "pass";

const PIPELINE: Record<PipelineStage, { label: string; color: string; bg: string; border: string }> = {
  new:       { label: "New",       color: "#6b7280", bg: "#f9fafb",  border: "#e5e7eb" },
  interview: { label: "Interview", color: "#2563eb", bg: "#eff6ff",  border: "#bfdbfe" },
  hold:      { label: "On Hold",   color: "#d97706", bg: "#fffbeb",  border: "#fde68a" },
  offer:     { label: "Offer",     color: "#7c3aed", bg: "#f5f3ff",  border: "#ddd6fe" },
  hired:     { label: "Hired",     color: "#16a34a", bg: "#f0fdf4",  border: "#bbf7d0" },
  pass:      { label: "Pass",      color: "#dc2626", bg: "#fef2f2",  border: "#fecaca" },
};

type RecFilter = "All" | "Strongly Recommended" | "Recommended" | "Consider" | "Not Recommended";
type SortBy    = "score" | "confidence" | "skills";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const REC_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; short: string }> = {
  "Strongly Recommended": { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", short: "Strong Rec." },
  "Recommended":          { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", short: "Recommended" },
  "Consider":             { color: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", short: "Consider"    },
  "Not Recommended":      { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444", short: "Not Rec."    },
};

function scoreColor(s: number): string {
  if (s >= 80) return "#16a34a";
  if (s >= 65) return "#2563eb";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}

const SEVERITY_COLOR: Record<string, string> = { high: "#dc2626", medium: "#d97706", low: "#6b7280" };

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function displayName(c: CandidateScore): string {
  if (c.candidateName?.trim()) return c.candidateName;
  return c.email.split("@")[0];
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

// ─── Micro components ─────────────────────────────────────────────────────────

function ScoreBar({ value }: { value: number }) {
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-20 h-1.5 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-sm font-semibold tabular-nums w-7" style={{ color }}>{value}</span>
    </div>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const cfg = REC_CONFIG[rec] ?? { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", dot: "#9ca3af", short: rec };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.short}
    </span>
  );
}

function ConfTag({ score }: { score: number }) {
  const color  = score >= 85 ? "#16a34a" : score >= 65 ? "#d97706" : "#dc2626";
  const bg     = score >= 85 ? "#f0fdf4" : score >= 65 ? "#fffbeb" : "#fef2f2";
  const border = score >= 85 ? "#bbf7d0" : score >= 65 ? "#fde68a" : "#fecaca";
  const label  = score >= 85 ? "High"    : score >= 65 ? "Med"     : "Low";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
      style={{ background: bg, color, border: `1px solid ${border}` }}>
      <Shield className="w-2.5 h-2.5" />{score}% {label}
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
        className="appearance-none text-xs font-medium pl-2 pr-6 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
      >
        {(Object.entries(PIPELINE) as [PipelineStage, typeof PIPELINE[PipelineStage]][]).map(([v, s]) => (
          <option key={v} value={v}>{s.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: p.color }} />
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
        <div className="mx-4 mb-4 rounded-lg overflow-hidden" style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "#e5e7eb", background: "#ffffff" }}>
            {([
              { id: "overview",  label: "Overview",            icon: BarChart3     },
              { id: "interview", label: "Interview Questions", icon: MessageSquare },
              { id: "bias",      label: "Bias Report",         icon: Eye           },
            ] as { id: typeof tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors"
                style={{
                  borderBottomColor: tab === id ? "#3b82f6" : "transparent",
                  color: tab === id ? "#2563eb" : "#6b7280",
                }}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Overview */}
            {tab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  {/* Summary */}
                  <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{candidate.summary}</p>

                  {/* Score breakdown table */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>Score Breakdown</p>
                    <div className="space-y-2">
                      {[
                        ["Skills",       candidate.breakdown.skillsScore      ],
                        ["Experience",   candidate.breakdown.experienceScore  ],
                        ["Education",    candidate.breakdown.educationScore   ],
                        ["Projects",     candidate.breakdown.projectsScore    ],
                        ["Availability", candidate.breakdown.availabilityScore],
                      ].map(([label, val]) => (
                        <div key={label as string} className="flex items-center gap-3">
                          <span className="text-xs w-20 flex-shrink-0" style={{ color: "#6b7280" }}>{label}</span>
                          <ScoreBar value={val as number} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths & Gaps */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#16a34a" }}>Strengths</p>
                      <ul className="space-y-1.5">
                        {candidate.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "#374151" }}>
                            <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#dc2626" }}>Gaps</p>
                      <ul className="space-y-1.5">
                        {candidate.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "#374151" }}>
                            <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Skill gap pills */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skillGapAnalysis.matched.map(s => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>✓ {s}</span>
                      ))}
                      {candidate.skillGapAnalysis.missing.map(s => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>✗ {s}</span>
                      ))}
                      {candidate.skillGapAnalysis.bonus.map(s => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>+ {s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Evaluation notes */}
                  {candidate.reasoning && (
                    <div className="p-3 rounded-lg" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#9ca3af" }}>Evaluation Notes</p>
                      <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>{candidate.reasoning}</p>
                    </div>
                  )}

                  {/* Risk flags */}
                  {candidate.riskFlags?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#d97706" }}>Risk Flags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.riskFlags.map((r, i) => (
                          <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                            style={{ background: `${SEVERITY_COLOR[r.severity]}14`, color: SEVERITY_COLOR[r.severity], border: `1px solid ${SEVERITY_COLOR[r.severity]}30` }}>
                            <AlertTriangle className="w-2.5 h-2.5" />{r.type.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Radar chart */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>Score Profile</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radar}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                        <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, color: "#111827" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Interview */}
            {tab === "interview" && (
              <ol className="space-y-2.5 max-w-2xl">
                {candidate.interviewQuestions.map((q, i) => (
                  <li key={i} className="flex gap-3 p-3 rounded-lg text-sm" style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#374151" }}>
                    <span className="font-bold text-blue-600 flex-shrink-0 w-5">{i + 1}.</span>{q}
                  </li>
                ))}
              </ol>
            )}

            {/* Bias */}
            {tab === "bias" && (
              <div className="max-w-2xl">
                {candidate.biasFlags?.length > 0 ? (
                  <div className="space-y-3">
                    {candidate.biasFlags.map((b, i) => (
                      <div key={i} className="p-3 rounded-lg" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                        <p className="text-xs font-semibold text-amber-700">{b.type.replace(/_/g, " ")}</p>
                        <p className="text-xs mt-1" style={{ color: "#6b7280" }}>Signal: {b.signal}</p>
                        <p className="text-xs mt-0.5 text-blue-600">Recommendation: {b.recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-xs text-green-700">No bias signals detected in this assessment.</p>
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

// ─── Table row ────────────────────────────────────────────────────────────────
function CandidateRow({ candidate, isSelected, onSelect, stage, onStageChange, isExpanded, onToggle, index }: {
  candidate: CandidateScore;
  isSelected: boolean;
  onSelect: (id: string) => void;
  stage: PipelineStage;
  onStageChange: (id: string, s: PipelineStage) => void;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  index: number;
}) {
  const isTop3 = candidate.rank <= 3;
  const rowBg  = isExpanded ? "#f0f7ff" : isSelected ? "#eff6ff" : "transparent";

  return (
    <>
      <tr
        className="group cursor-pointer transition-colors hover:bg-blue-50/40"
        style={{ borderBottom: "1px solid #f3f4f6", background: rowBg }}
        onClick={() => onToggle(candidate.candidateId)}
      >
        {/* Checkbox */}
        <td className="pl-4 pr-3 py-3.5 w-9" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onSelect(candidate.candidateId)}
            className="w-4 h-4 rounded flex items-center justify-center transition-all"
            style={{
              background: isSelected ? "#2563eb" : "#ffffff",
              border: `1.5px solid ${isSelected ? "#2563eb" : "#d1d5db"}`,
            }}>
            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
        </td>

        {/* Rank */}
        <td className="px-3 py-3.5 w-12">
          <span className="text-xs font-bold tabular-nums" style={{ color: isTop3 ? "#d97706" : "#9ca3af" }}>
            #{candidate.rank}
          </span>
        </td>

        {/* Candidate */}
        <td className="px-3 py-3.5">
          <p className="text-sm font-semibold" style={{ color: "#111827" }}>{displayName(candidate)}</p>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{candidate.email}</p>
          <div className="mt-1.5">
            <ConfTag score={candidate.confidenceScore} />
          </div>
        </td>

        {/* Score */}
        <td className="px-3 py-3.5 w-36">
          <ScoreBar value={candidate.finalScore} />
        </td>

        {/* Recommendation */}
        <td className="px-3 py-3.5 w-36">
          <RecBadge rec={candidate.recommendation} />
        </td>

        {/* Stage */}
        <td className="px-3 py-3.5 w-32" onClick={e => e.stopPropagation()}>
          <StageSelect stage={stage} onChange={s => onStageChange(candidate.candidateId, s)} />
        </td>

        {/* Expand */}
        <td className="pl-2 pr-4 py-3.5 w-8">
          <ChevronRight
            className="w-4 h-4 transition-transform"
            style={{ color: "#d1d5db", transform: isExpanded ? "rotate(90deg)" : "none" }}
          />
        </td>
      </tr>

      {isExpanded && <CandidateDetail candidate={candidate} />}
    </>
  );
}

// ─── Rejected row ─────────────────────────────────────────────────────────────
function RejectedRow({ rejected }: { rejected: RejectedCandidate }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ borderBottom: "1px solid #f3f4f6" }}
        onClick={() => setOpen(v => !v)}>
        <td className="pl-4 pr-3 py-3 w-9" />
        <td className="px-3 py-3 w-12">
          <span className="text-xs font-semibold tabular-nums" style={{ color: "#dc2626" }}>{rejected.finalScore}</span>
        </td>
        <td className="px-3 py-3">
          <p className="text-sm font-medium" style={{ color: "#374151" }}>{rejected.candidateName || rejected.email.split("@")[0]}</p>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{rejected.email}</p>
        </td>
        <td className="px-3 py-3 w-36">
          <ScoreBar value={rejected.finalScore} />
        </td>
        <td className="px-3 py-3 w-36">
          <span className="text-xs" style={{ color: "#9ca3af" }}>
            {Math.round(rejected.closestShortlistScore - rejected.finalScore)} pts below cutoff
          </span>
        </td>
        <td className="px-3 py-3 w-32" />
        <td className="pl-2 pr-4 py-3 w-8">
          <ChevronRight className="w-4 h-4 transition-transform" style={{ color: "#d1d5db", transform: open ? "rotate(90deg)" : "none" }} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="mx-4 mb-3 p-4 rounded-lg space-y-3" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
                  <TrendingDown className="w-3 h-3" /> Reason Not Selected
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>{rejected.whyNotSelected}</p>
              </div>
              {rejected.topMissingSkills?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#dc2626" }}>Missing Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rejected.topMissingSkills.map(s => (
                      <span key={s} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>✗ {s}</span>
                    ))}
                  </div>
                </div>
              )}
              {rejected.improvementSuggestions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1" style={{ color: "#2563eb" }}>
                    <Lightbulb className="w-3 h-3" /> Improvement Areas
                  </p>
                  <ul className="space-y-1">
                    {rejected.improvementSuggestions.map((s, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "#374151" }}>
                        <span style={{ color: "#3b82f6" }}>→</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ result }: { result: ScreeningResult }) {
  const dist    = result.aggregateInsights?.scoreDistribution.filter(d => d.count > 0) ?? [];
  const avgScore = result.shortlist.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.finalScore, 0) / result.shortlist.length) : 0;
  const avgConf  = result.shortlist.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.confidenceScore, 0) / result.shortlist.length) : 0;

  const card = "rounded-lg p-4 space-y-3 bg-white border border-gray-200";
  const label = "text-[10px] font-semibold uppercase tracking-widest text-gray-400";
  const row = "flex items-center justify-between";

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className={card}>
        <p className={label}>Cohort Summary</p>
        <div className="space-y-2">
          {[
            { l: "Screened",    v: result.totalApplicants },
            { l: "Shortlisted", v: result.shortlistSize   },
            { l: "Rejected",    v: result.rejectedCandidates?.length ?? 0 },
            { l: "Avg Score",   v: `${avgScore}%` },
            { l: "Top Score",   v: `${result.shortlist[0]?.finalScore ?? 0}%` },
            { l: "Avg Confidence", v: `${avgConf}%` },
            { l: "Duration",    v: `${(result.processingTimeMs / 1000).toFixed(1)}s` },
          ].map(({ l, v }) => (
            <div key={l} className={row}>
              <span className="text-xs text-gray-500">{l}</span>
              <span className="text-sm font-semibold text-gray-900">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation breakdown */}
      {result.aggregateInsights?.recommendationBreakdown && (
        <div className={card}>
          <p className={label}>Recommendations</p>
          <div className="space-y-2.5">
            {Object.entries(result.aggregateInsights.recommendationBreakdown).map(([rec, count]) => {
              const cfg = REC_CONFIG[rec];
              if (!cfg) return null;
              const pct = Math.round((count / (result.shortlistSize || 1)) * 100);
              return (
                <div key={rec}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.short}</span>
                    <span className="text-xs font-bold" style={{ color: cfg.color }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: cfg.color }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score distribution */}
      {dist.length > 0 && (
        <div className={card}>
          <p className={label}>Score Distribution</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist} barSize={20}>
                <XAxis dataKey="range" tick={{ fill: "#9ca3af", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number) => [`${v} candidates`]} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {dist.map((e, i) => {
                    const [lo] = e.range.split("-").map(Number);
                    return <Cell key={i} fill={lo >= 80 ? "#16a34a" : lo >= 65 ? "#2563eb" : lo >= 50 ? "#d97706" : "#9ca3af"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Common gaps */}
      {result.aggregateInsights?.commonGaps?.length > 0 && (
        <div className={card}>
          <p className={label}>Common Skill Gaps</p>
          <div className="flex flex-wrap gap-1.5">
            {result.aggregateInsights.commonGaps.slice(0, 8).map(g => (
              <span key={g.skill} className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                {g.skill} ({g.missingCount})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ResultDetailPage() {
  const dispatch = useDispatch<AppDispatch>();
  const params   = useParams();
  const id       = params.id as string;
  const { current: result, loading } = useSelector((s: RootState) => s.screening);

  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [filter, setFilter]             = useState<RecFilter>("All");
  const [sortBy, setSortBy]             = useState<SortBy>("score");
  const [stages, setStages]             = useState<Record<string, PipelineStage>>({});

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

  const toggleSelect  = (cid: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });
  const toggleAll     = () => { if (!result) return; setSelectedIds(selectedIds.size === result.shortlist.length ? new Set() : new Set(result.shortlist.map(c => c.candidateId))); };
  const toggleExpand  = (cid: string) => setExpandedId(prev => prev === cid ? null : cid);

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

  if (loading || !result) {
    return (
      <div className="max-w-7xl mx-auto space-y-4 animate-pulse">
        <div className="h-10 rounded-lg bg-gray-100 w-80" />
        <div className="h-24 rounded-lg bg-gray-100" />
        <div className="h-96 rounded-lg bg-gray-100" />
      </div>
    );
  }

  const allSelected  = result.shortlist.length > 0 && selectedIds.size === result.shortlist.length;
  const avgScore     = result.shortlist.length ? Math.round(result.shortlist.reduce((a, c) => a + c.finalScore, 0) / result.shortlist.length) : 0;
  const REC_FILTERS: RecFilter[] = ["All", "Strongly Recommended", "Recommended", "Consider", "Not Recommended"];

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link href="/results" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">Screening Results</span>
          <span className="text-gray-400">/</span>
          <span className="font-semibold text-gray-900 truncate">{result.jobTitle}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedIds.size > 0 && (
            <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-blue-600 text-white hover:bg-blue-700">
              {exporting
                ? <><Sparkles className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                : <><Download className="w-3.5 h-3.5" /> Export {selectedIds.size} PDF</>}
            </motion.button>
          )}
          <span className="text-xs px-2.5 py-1.5 rounded bg-gray-100 text-gray-500 font-medium">
            {new Date(result.screeningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Screened",       value: result.totalApplicants,                suffix: "" },
          { label: "Shortlisted",    value: result.shortlistSize,                  suffix: "" },
          { label: "Avg Score",      value: avgScore,                              suffix: "%" },
          { label: "Top Score",      value: result.shortlist[0]?.finalScore ?? 0,  suffix: "%", accent: true },
          { label: "Avg Confidence", value: result.shortlist.length ? Math.round(result.shortlist.reduce((a, c) => a + c.confidenceScore, 0) / result.shortlist.length) : 0, suffix: "%" },
        ].map(({ label, value, suffix, accent }) => (
          <div key={label} className="rounded-lg px-4 py-3 bg-white border border-gray-200">
            <p className="text-[10px] uppercase tracking-widest font-medium text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color: accent ? scoreColor(value as number) : "#111827" }}>
              {value}{suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Two column */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_252px] gap-5 items-start">

        {/* Table */}
        <div className="rounded-lg overflow-hidden bg-white border border-gray-200">

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1 flex-wrap">
              {REC_FILTERS.map(f => {
                const count  = f === "All" ? result.shortlist.length : result.shortlist.filter(c => c.recommendation === f).length;
                const cfg    = REC_CONFIG[f];
                const active = filter === f;
                if (count === 0 && f !== "All") return null;
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    className="text-xs font-medium px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: active ? (cfg ? cfg.bg   : "#f3f4f6") : "transparent",
                      color:      active ? (cfg ? cfg.color : "#374151") : "#6b7280",
                      border:     `1px solid ${active ? (cfg ? cfg.border : "#d1d5db") : "transparent"}`,
                    }}>
                    {f === "All" ? "All" : (cfg?.short ?? f)} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
                className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="score">Sort: Score</option>
                <option value="confidence">Sort: Confidence</option>
                <option value="skills">Sort: Skills</option>
              </select>
              <button onClick={toggleAll}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors">
                {allSelected ? <><CheckSquare className="w-3 h-3" /> Deselect all</> : <><Square className="w-3 h-3" /> Select all</>}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="pl-4 pr-3 py-2.5 w-9" />
                  <th className="px-3 py-2.5 w-12 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">Candidate</th>
                  <th className="px-3 py-2.5 w-36 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">Score</th>
                  <th className="px-3 py-2.5 w-36 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">Recommendation</th>
                  <th className="px-3 py-2.5 w-32 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">Stage</th>
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
              <button onClick={() => setShowRejected(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm border-t border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-medium text-gray-600">Not Shortlisted</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-medium">
                    {result.rejectedCandidates.length}
                  </span>
                </div>
                {showRejected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showRejected && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <table className="w-full" style={{ borderCollapse: "collapse" }}>
                      <tbody>
                        {result.rejectedCandidates.map(r => <RejectedRow key={r.candidateId} rejected={r} />)}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="sticky top-6">
          <Sidebar result={result} />
        </div>
      </div>
    </div>
  );
}
