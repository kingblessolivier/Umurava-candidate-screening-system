"use client";
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchResult } from "@/store/screeningSlice";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Users, Clock, Zap, ChevronDown, ChevronUp,
  MessageSquare, CheckCircle, XCircle, Star, AlertTriangle,
  Shield, Eye, TrendingDown, Lightbulb, BarChart3,
  Download, FileText, Check, Square, CheckSquare, Printer,
  Award, Target, Brain, Sparkles,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, Cell,
} from "recharts";
import { CandidateScore, RejectedCandidate, AggregateInsights } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REC_STYLE: Record<string, { glow: string; border: string; badge: string }> = {
  "Strongly Recommended": { glow: "rgba(34,197,94,0.06)",  border: "rgba(34,197,94,0.2)",  badge: "#22c55e" },
  "Recommended":          { glow: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.2)", badge: "#60a5fa" },
  "Consider":             { glow: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", badge: "#f59e0b" },
  "Not Recommended":      { glow: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.2)",  badge: "#ef4444" },
};

function scoreColor(s: number): string {
  if (s >= 80) return "#22c55e";
  if (s >= 65) return "#60a5fa";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

function rankBadge(rank: number) {
  if (rank === 1) return { bg: "rgba(251,191,36,0.15)", color: "#fbbf24", label: "🥇" };
  if (rank === 2) return { bg: "rgba(156,163,175,0.15)", color: "#9ca3af", label: "🥈" };
  if (rank === 3) return { bg: "rgba(180,120,80,0.15)",  color: "#cd7f32", label: "🥉" };
  return { bg: "rgba(255,255,255,0.04)", color: "#6b7280", label: `#${rank}` };
}

const SEVERITY_COLOR: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#64748b" };

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportPDF(candidates: CandidateScore[], jobTitle: string, screeningDate: string, aiModel: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = W - margin * 2;

  const addHeader = (pageNum: number) => {
    doc.setFillColor(13, 18, 32);
    doc.rect(0, 0, W, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(96, 165, 250);
    doc.text("TALENTAI — AI SCREENING REPORT", margin, 9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Page ${pageNum}`, W - margin, 9, { align: "right" });
  };

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · Powered by ${aiModel} · TalentAI`, margin, H - 8);
    doc.setDrawColor(30, 40, 60);
    doc.line(margin, H - 12, W - margin, H - 12);
  };

  // ── Page 1: Cover ──────────────────────────────────────────────────────────
  addHeader(1);

  // Hero gradient block
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 14, W, 80, "F");
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 14, 4, 80, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("AI Candidate", margin + 6, 50);
  doc.setTextColor(96, 165, 250);
  doc.text("Screening Report", margin + 6, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(156, 163, 175);
  doc.text(`Job Position: ${jobTitle}`, margin + 6, 78);
  doc.setFontSize(9);
  doc.text(`Screening Date: ${new Date(screeningDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, margin + 6, 86);
  doc.text(`AI Model: ${aiModel}`, margin + 6, 92);

  // Candidate count badge
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(W - margin - 6 - 40, 50, 46, 22, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`${candidates.length}`, W - margin - 6 - 17, 63, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("SELECTED", W - margin - 6 - 17, 69, { align: "center" });

  // Report summary table
  let y = 110;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Report Summary", margin, y);
  y += 6;

  const avgFinal = Math.round(candidates.reduce((a, c) => a + c.finalScore, 0) / candidates.length);
  const avgConf = Math.round(candidates.reduce((a, c) => a + c.confidenceScore, 0) / candidates.length);
  const topScore = Math.max(...candidates.map(c => c.finalScore));

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Metric", "Value"]],
    body: [
      ["Candidates in Report", `${candidates.length}`],
      ["Highest Score", `${topScore}%`],
      ["Average Score", `${avgFinal}%`],
      ["Average Confidence", `${avgConf}%`],
      ["Job Position", jobTitle],
    ],
    theme: "plain",
    styles: { fontSize: 9, textColor: [209, 213, 219], cellPadding: 3, fillColor: [17, 24, 39] },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [26, 32, 44] },
    columnStyles: { 0: { fontStyle: "bold", textColor: [156, 163, 175] }, 1: { textColor: [255, 255, 255] } },
  });

  // Score bar preview (top 5)
  y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Quick Ranking Preview", margin, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Rank", "Candidate", "Score", "Recommendation", "Confidence"]],
    body: candidates.slice(0, 5).map((c) => [
      `#${c.rank}`, c.candidateName, `${c.finalScore}%`, c.recommendation, `${c.confidenceScore}%`,
    ]),
    theme: "plain",
    styles: { fontSize: 9, textColor: [209, 213, 219], cellPadding: 3, fillColor: [17, 24, 39] },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [26, 32, 44] },
    columnStyles: { 0: { textColor: [251, 191, 36] }, 2: { textColor: [34, 197, 94] } },
  });

  addFooter();

  // ── Per-candidate pages ────────────────────────────────────────────────────
  candidates.forEach((c, idx) => {
    doc.addPage();
    const pageNum = idx + 2;
    addHeader(pageNum);

    y = 22;
    // Candidate header block
    doc.setFillColor(17, 24, 39);
    doc.rect(margin, y, contentW, 28, "F");
    const recBadgeColor = { "Strongly Recommended": [34, 197, 94], Recommended: [96, 165, 250], Consider: [245, 158, 11], "Not Recommended": [239, 68, 68] }[c.recommendation] ?? [100, 116, 139];
    doc.setFillColor(...(recBadgeColor as [number, number, number]));
    doc.rect(margin, y, 3, 28, "F");

    // Rank + name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(`#${c.rank}  ${c.candidateName}`, margin + 7, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(c.email, margin + 7, y + 19);
    doc.text(c.recommendation, margin + 7, y + 25);

    // Score circle (right side)
    const scoreX = W - margin - 20;
    const scoreY = y + 14;
    doc.setFillColor(...(scoreColor(c.finalScore).startsWith("#") ? hexToRgb(scoreColor(c.finalScore)) as [number, number, number] : [34, 197, 94]));
    doc.circle(scoreX, scoreY, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`${c.finalScore}`, scoreX, scoreY + 1, { align: "center" });
    doc.setFontSize(7);
    doc.text("/ 100", scoreX, scoreY + 6, { align: "center" });

    y += 36;

    // Summary
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    const summaryLines = doc.splitTextToSize(c.summary, contentW);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 6;

    // Score breakdown
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Category", "Score", "Weight Impact"]],
      body: [
        ["Skills Match",    `${c.breakdown.skillsScore}%`,       "High Priority"],
        ["Work Experience", `${c.breakdown.experienceScore}%`,    "High Priority"],
        ["Education",       `${c.breakdown.educationScore}%`,     "Medium Priority"],
        ["Projects",        `${c.breakdown.projectsScore}%`,      "Medium Priority"],
        ["Availability",    `${c.breakdown.availabilityScore}%`,  "Low Priority"],
        ["FINAL SCORE",     `${c.finalScore}%`,                  `Confidence: ${c.confidenceScore}%`],
      ],
      theme: "plain",
      styles: { fontSize: 9, textColor: [209, 213, 219], cellPadding: 3, fillColor: [17, 24, 39] },
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [26, 32, 44] },
      bodyStyles: {},
      didParseCell: (data) => {
        if (data.row.index === 5) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = [34, 197, 94];
        }
      },
    });

    y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
    y += 8;

    // Strengths + Gaps in 2 columns
    const colW = (contentW - 4) / 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(34, 197, 94);
    doc.text("✓ STRENGTHS", margin, y);
    doc.setTextColor(239, 68, 68);
    doc.text("✗ GAPS", margin + colW + 4, y);
    y += 5;

    const maxRows = Math.max(c.strengths.length, c.gaps.length);
    for (let i = 0; i < Math.min(maxRows, 4); i++) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      if (c.strengths[i]) {
        const lines = doc.splitTextToSize(`• ${c.strengths[i]}`, colW - 2);
        doc.text(lines, margin, y);
      }
      if (c.gaps[i]) {
        const lines = doc.splitTextToSize(`• ${c.gaps[i]}`, colW - 2);
        doc.text(lines, margin + colW + 4, y);
      }
      y += 6;
    }

    y += 4;

    // Skill gap analysis
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Skill Gap Analysis", margin, y);
    y += 5;

    const skillRows = [];
    if (c.skillGapAnalysis.matched.length > 0)
      skillRows.push(["✓ Matched", c.skillGapAnalysis.matched.join(", ")]);
    if (c.skillGapAnalysis.missing.length > 0)
      skillRows.push(["✗ Missing", c.skillGapAnalysis.missing.join(", ")]);
    if (c.skillGapAnalysis.bonus.length > 0)
      skillRows.push(["+ Bonus", c.skillGapAnalysis.bonus.join(", ")]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: skillRows,
      theme: "plain",
      styles: { fontSize: 8, textColor: [156, 163, 175], cellPadding: 2.5, fillColor: [17, 24, 39] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 28, textColor: [209, 213, 219] },
        1: { textColor: [156, 163, 175] },
      },
    });

    y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
    y += 8;

    // Interview questions
    if (y < H - 60) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(167, 139, 250);
      doc.text("Tailored Interview Questions", margin, y);
      y += 5;

      c.interviewQuestions.forEach((q, qi) => {
        if (y > H - 30) return;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(209, 213, 219);
        const lines = doc.splitTextToSize(`${qi + 1}. ${q}`, contentW);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 2;
      });
    }

    // AI reasoning (if space)
    if (y < H - 50 && c.reasoning) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(167, 139, 250);
      doc.text("AI Reasoning", margin, y);
      y += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const lines = doc.splitTextToSize(c.reasoning, contentW);
      doc.text(lines.slice(0, 6), margin, y);
    }

    addFooter();
  });

  doc.save(`TalentAI-Report-${jobTitle.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ─── Confidence Badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const level = score >= 85 ? "High" : score >= 65 ? "Medium" : "Low";
  const color = score >= 85 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      <Shield className="w-2.5 h-2.5" />
      {score}% confidence · {level}
    </span>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-[11px] font-semibold" style={{ color: scoreColor(value) }}>{value}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #3b82f6, #7c3aed)" }}
          initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
      </div>
    </div>
  );
}

// ─── Candidate Card ────────────────────────────────────────────────────────────

function CandidateCard({ candidate, rank, isSelected, onSelect }: {
  candidate: CandidateScore;
  rank: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "interview" | "bias">("analysis");

  const style = REC_STYLE[candidate.recommendation] ?? REC_STYLE["Consider"];
  const badge = rankBadge(rank);

  const radarData = [
    { subject: "Skills",     value: candidate.breakdown.skillsScore },
    { subject: "Experience", value: candidate.breakdown.experienceScore },
    { subject: "Education",  value: candidate.breakdown.educationScore },
    { subject: "Projects",   value: candidate.breakdown.projectsScore },
    { subject: "Avail.",     value: candidate.breakdown.availabilityScore },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: style.glow,
        border: `1px solid ${isSelected ? style.badge : style.border}`,
        boxShadow: isSelected ? `0 0 0 2px ${style.badge}40` : "none",
      }}
    >
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          {/* Checkbox */}
          <button onClick={() => onSelect(candidate.candidateId)}
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-1 transition-all"
            style={{
              background: isSelected ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${isSelected ? "#3b82f6" : "rgba(255,255,255,0.12)"}`,
            }}>
            {isSelected && <Check className="w-3 h-3 text-blue-400" />}
          </button>

          <div className="flex items-start justify-between gap-4 flex-1 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: badge.bg, color: badge.color }}>
                  {badge.label}
                </div>
                <h3 className="font-semibold text-white text-sm">{candidate.candidateName}</h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${style.badge}18`, color: style.badge, border: `1px solid ${style.badge}30` }}>
                  {candidate.recommendation}
                </span>
              </div>
              <p className="text-[11px] ml-10 truncate" style={{ color: "var(--text-muted)" }}>{candidate.email}</p>
              <div className="mt-1.5 ml-10">
                <ConfidenceBadge score={candidate.confidenceScore} />
              </div>
            </div>
            {/* Score */}
            <div className="text-right flex-shrink-0">
              <p className="text-4xl font-bold leading-none tabular-nums" style={{ color: scoreColor(candidate.finalScore) }}>
                {candidate.finalScore}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>/ 100</p>
            </div>
          </div>
        </div>

        <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>{candidate.summary}</p>

        {/* Score breakdown */}
        <div className="space-y-2.5">
          <ScoreBar label="Skills Match"    value={candidate.breakdown.skillsScore} />
          <ScoreBar label="Work Experience" value={candidate.breakdown.experienceScore} />
          <ScoreBar label="Education"       value={candidate.breakdown.educationScore} />
          <ScoreBar label="Projects"        value={candidate.breakdown.projectsScore} />
        </div>

        {/* Risk flags */}
        {candidate.riskFlags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {candidate.riskFlags.map((r, i) => (
              <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: `${SEVERITY_COLOR[r.severity]}12`, color: SEVERITY_COLOR[r.severity], border: `1px solid ${SEVERITY_COLOR[r.severity]}25` }}>
                <AlertTriangle className="w-2.5 h-2.5" />{r.type.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        <button onClick={() => setExpanded(e => !e)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg transition-colors"
          style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
          {expanded ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> Full Analysis</>}
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="p-5 space-y-5">
              {/* Sub-tabs */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                {([
                  { id: "analysis", label: "Analysis", icon: BarChart3 },
                  { id: "interview", label: "Interview Qs", icon: MessageSquare },
                  { id: "bias", label: "Bias Check", icon: Eye },
                ] as { id: typeof activeTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                    style={{
                      background: activeTab === id ? "rgba(59,130,246,0.15)" : "transparent",
                      color:      activeTab === id ? "#60a5fa"               : "var(--text-muted)",
                    }}>
                    <Icon className="w-3 h-3" /> {label}
                  </button>
                ))}
              </div>

              {/* Analysis tab */}
              {activeTab === "analysis" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-green-500 mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Strengths
                      </p>
                      <ul className="space-y-1.5">
                        {candidate.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "#9ca3af" }}>
                            <Star className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Gaps
                      </p>
                      <ul className="space-y-1.5">
                        {candidate.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "#9ca3af" }}>
                            <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Risks
                      </p>
                      <ul className="space-y-1.5">
                        {candidate.risks.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "#9ca3af" }}>
                            <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />{r}
                          </li>
                        ))}
                        {!candidate.risks?.length && <li className="text-[11px] text-gray-600">No risks detected</li>}
                      </ul>
                    </div>
                  </div>

                  {/* Skill gap pills */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Skill Gap Analysis</p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skillGapAnalysis.matched.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.08)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>✓ {s}</span>
                      ))}
                      {candidate.skillGapAnalysis.missing.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>✗ {s}</span>
                      ))}
                      {candidate.skillGapAnalysis.bonus.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.08)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>+ {s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Radar chart */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Score Breakdown</p>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.06)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#4b5563", fontSize: 10 }} />
                          <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                          <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 11, color: "#e5e7eb" }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  {candidate.reasoning && (
                    <div className="rounded-xl p-4" style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.12)" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-violet-400 flex items-center gap-1.5">
                        <Brain className="w-3 h-3" /> AI Reasoning
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{candidate.reasoning}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Interview tab */}
              {activeTab === "interview" && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Tailored Interview Questions
                  </p>
                  <ol className="space-y-3">
                    {candidate.interviewQuestions.map((q, i) => (
                      <li key={i} className="flex gap-3 text-xs p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", color: "#9ca3af" }}>
                        <span className="font-bold flex-shrink-0 text-violet-400">{i + 1}.</span>{q}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Bias tab */}
              {activeTab === "bias" && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <Eye className="w-3 h-3" /> Bias Detection Report
                  </p>
                  {candidate.biasFlags?.length > 0 ? (
                    <div className="space-y-3">
                      {candidate.biasFlags.map((b, i) => (
                        <div key={i} className="rounded-xl p-3 space-y-1" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                          <p className="text-[11px] font-semibold text-amber-400">{b.type.replace(/_/g, " ")}</p>
                          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Signal: {b.signal}</p>
                          <p className="text-[11px] text-blue-400">✦ {b.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <p className="text-xs text-green-400">No bias signals detected in this assessment</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Why Not Selected Card ─────────────────────────────────────────────────────

function RejectedCard({ rejected }: { rejected: RejectedCandidate }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "rgba(100,116,139,0.15)", color: "#64748b" }}>
            {rejected.finalScore}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{rejected.candidateName}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{rejected.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-red-400">
            Not shortlisted · {Math.round(rejected.closestShortlistScore - rejected.finalScore)} pts below cutoff
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <TrendingDown className="w-3 h-3" /> Why Not Selected
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{rejected.whyNotSelected}</p>
            </div>
            {rejected.topMissingSkills?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-red-400">Missing Critical Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {rejected.topMissingSkills.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                      ✗ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {rejected.improvementSuggestions?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-blue-400 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Improvement Suggestions
                </p>
                <ul className="space-y-1.5">
                  {rejected.improvementSuggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "#9ca3af" }}>
                      <span className="text-blue-400 flex-shrink-0">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Aggregate Panel ──────────────────────────────────────────────────────────

function AggregatePanel({ insights }: { insights: AggregateInsights }) {
  const distData = insights.scoreDistribution.filter(d => d.count > 0);
  return (
    <div className="rounded-2xl p-6 space-y-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <h3 className="font-semibold text-white text-sm flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-400" /> Cohort Insights
      </h3>
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Score Distribution</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData} barSize={24}>
              <XAxis dataKey="range" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, color: "#e5e7eb" }}
                formatter={(val: number) => [`${val} candidates`, "Count"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distData.map((entry, i) => {
                  const [lo] = entry.range.split("-").map(Number);
                  return <Cell key={i} fill={lo >= 80 ? "#22c55e" : lo >= 65 ? "#3b82f6" : lo >= 50 ? "#f59e0b" : "#64748b"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Average Scores by Category</p>
        <div className="space-y-2.5">
          {([ ["Skills", insights.avgScoreByCategory.skillsScore], ["Experience", insights.avgScoreByCategory.experienceScore],
              ["Education", insights.avgScoreByCategory.educationScore], ["Projects", insights.avgScoreByCategory.projectsScore],
              ["Availability", insights.avgScoreByCategory.availabilityScore],
          ] as [string, number][]).map(([label, value]) => (
            <ScoreBar key={label} label={label} value={value} />
          ))}
        </div>
      </div>
      {insights.commonGaps?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Most Common Missing Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {insights.commonGaps.slice(0, 8).map(g => (
              <span key={g.skill} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                ✗ {g.skill} ({g.missingCount})
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Recommendation Breakdown</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(insights.recommendationBreakdown || {}).map(([rec, count]) => {
            const color = REC_STYLE[rec]?.badge || "#64748b";
            return (
              <div key={rec} className="flex items-center justify-between p-2 rounded-lg" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                <span className="text-[11px]" style={{ color }}>{rec}</span>
                <span className="text-[11px] font-bold" style={{ color }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultDetailPage() {
  const dispatch  = useDispatch<AppDispatch>();
  const params    = useParams();
  const id        = params.id as string;
  const { current: result, loading } = useSelector((s: RootState) => s.screening);

  const [showRejected, setShowRejected] = useState(false);
  const [activeView, setActiveView]     = useState<"shortlist" | "insights">("shortlist");
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [exporting, setExporting]       = useState(false);

  useEffect(() => { if (id) dispatch(fetchResult(id)); }, [id, dispatch]);

  const toggleSelect = (candidateId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(candidateId) ? next.delete(candidateId) : next.add(candidateId);
      return next;
    });
  };

  const toggleAll = () => {
    if (!result) return;
    if (selectedIds.size === result.shortlist.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(result.shortlist.map(c => c.candidateId)));
  };

  const selectedCandidates = useMemo(
    () => result?.shortlist.filter(c => selectedIds.has(c.candidateId)) ?? [],
    [result, selectedIds]
  );

  const handleExport = async () => {
    if (!result || selectedCandidates.length === 0) return;
    setExporting(true);
    try {
      await exportPDF(selectedCandidates, result.jobTitle, result.screeningDate, result.aiModel);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading || !result) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />
        ))}
      </div>
    );
  }

  const avgScore = result.shortlist.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.finalScore, 0) / result.shortlist.length) : 0;
  const avgConf = result.shortlist.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.confidenceScore, 0) / result.shortlist.length) : 0;

  const allSelected = result.shortlist.length > 0 && selectedIds.size === result.shortlist.length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/results" className="p-2 rounded-xl hover:bg-white/5 text-gray-600 mt-0.5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">{result.jobTitle}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <Users className="w-3 h-3" />{result.totalApplicants} screened
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <Trophy className="w-3 h-3" />Top {result.shortlistSize} shortlisted
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <Clock className="w-3 h-3" />{(result.processingTimeMs / 1000).toFixed(1)}s
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <Zap className="w-3 h-3" />{result.aiModel}
            </span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Top Score",      value: `${result.shortlist[0]?.finalScore ?? 0}`, suffix: "%", color: "#22c55e", icon: Trophy },
          { label: "Avg Score",      value: `${avgScore}`,                             suffix: "%", color: "#60a5fa", icon: Target },
          { label: "Avg Confidence", value: `${avgConf}`,                             suffix: "%", color: "#a78bfa", icon: Shield },
          { label: "Not Selected",   value: `${result.rejectedCandidates?.length ?? 0}`, suffix: "", color: "#64748b", icon: Users },
        ].map(({ label, value, suffix, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <Icon className="w-4 h-4 mx-auto mb-2" style={{ color }} />
            <p className="text-2xl font-bold" style={{ color }}>{value}{suffix}</p>
            <p className="text-[10px] uppercase tracking-wide mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        {/* View toggle */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {(["shortlist", "insights"] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
              style={{
                background: activeView === v ? "rgba(59,130,246,0.15)" : "transparent",
                color:      activeView === v ? "#60a5fa"               : "var(--text-muted)",
              }}>
              {v === "shortlist" ? `Shortlist (${result.shortlistSize})` : "Cohort Insights"}
            </button>
          ))}
        </div>

        {/* Export controls — only in shortlist view */}
        {activeView === "shortlist" && (
          <div className="flex items-center gap-2 ml-auto">
            {/* Select all toggle */}
            <button onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.04)", color: allSelected ? "#60a5fa" : "var(--text-muted)" }}>
              {allSelected
                ? <><CheckSquare className="w-3.5 h-3.5" /> Deselect all</>
                : <><Square className="w-3.5 h-3.5" /> Select all</>}
            </button>

            {/* Export PDF button */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)", color: "#fff", boxShadow: "0 4px 12px rgba(59,130,246,0.25)" }}>
                  {exporting
                    ? <><Sparkles className="w-3.5 h-3.5 animate-spin" /> Generating PDF...</>
                    : <><Download className="w-3.5 h-3.5" /> Export {selectedIds.size} as PDF</>}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Selection banner */}
      <AnimatePresence>
        {selectedIds.size > 0 && activeView === "shortlist" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-300 flex-1">
              <strong>{selectedIds.size}</strong> candidate{selectedIds.size !== 1 ? "s" : ""} selected for export.
              The PDF will include full scoring breakdown, strengths, gaps, and tailored interview questions.
            </p>
            <button onClick={() => setSelectedIds(new Set())} className="text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortlist */}
      {activeView === "shortlist" && (
        <div className="space-y-3">
          {result.shortlist.map(c => (
            <CandidateCard
              key={c.candidateId}
              candidate={c}
              rank={c.rank}
              isSelected={selectedIds.has(c.candidateId)}
              onSelect={toggleSelect}
            />
          ))}

          {/* Why Not Selected */}
          {result.rejectedCandidates?.length > 0 && (
            <div className="mt-6">
              <button onClick={() => setShowRejected(v => !v)}
                className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-white">Why Not Selected?</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(100,116,139,0.15)", color: "#64748b" }}>
                    {result.rejectedCandidates.length} candidates
                  </span>
                </div>
                {showRejected ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
              </button>
              <AnimatePresence>
                {showRejected && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-2 space-y-2">
                    <p className="text-xs px-1 mb-3" style={{ color: "var(--text-muted)" }}>
                      Transparent explanations for every candidate not shortlisted — helping them understand the gaps and improve.
                    </p>
                    {result.rejectedCandidates.map(r => <RejectedCard key={r.candidateId} rejected={r} />)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      {activeView === "insights" && result.aggregateInsights && (
        <AggregatePanel insights={result.aggregateInsights} />
      )}
    </div>
  );
}
