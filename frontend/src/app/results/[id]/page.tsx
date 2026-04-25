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
  Database, Trophy, FileText, Server, Mail, Scale,
} from "lucide-react";
import { AIThinkingReviewModal } from "@/components/screening/AIThinkingReviewModal";
import EmailModal from "@/components/email/EmailModal";
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
async function exportPDF(
  candidates: CandidateScore[],
  jobTitle: string,
  screeningDate: string,
  rejectedCandidates?: RejectedCandidate[]
) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();
  const M   = 16;
  const CW  = W - M * 2;

  // Color palette
  type RGB = [number, number, number];
  const C = {
    navy:   [15,  23,  42]  as RGB,
    blue:   [37,  99,  235] as RGB,
    green:  [22,  163, 74]  as RGB,
    amber:  [217, 119, 6]   as RGB,
    red:    [220, 38,  38]  as RGB,
    gray:   [71,  85,  105] as RGB,
    lgray:  [148, 163, 184] as RGB,
    xlgray: [241, 245, 249] as RGB,
    white:  [255, 255, 255] as RGB,
  };

  const scoreRGB   = (s: number): RGB => s >= 70 ? C.green : s >= 50 ? C.amber : C.red;
  const recRGB     = (rec: string): RGB => {
    if (rec === "Strongly Recommended") return C.green;
    if (rec === "Recommended")          return C.blue;
    if (rec === "Consider")             return C.amber;
    return C.red;
  };

  const totalApplicants = candidates.length + (rejectedCandidates?.length || 0);
  const avgScore = candidates.length ? Math.round(candidates.reduce((a, c) => a + c.finalScore, 0) / candidates.length) : 0;
  const topScore = candidates.length ? Math.max(...candidates.map(c => c.finalScore)) : 0;

  let pageNum = 1;

  const drawBar = (x: number, y: number, w: number, h: number, pct: number, color: RGB) => {
    doc.setFillColor(...C.xlgray); doc.rect(x, y, w, h, "F");
    if (pct > 0) { doc.setFillColor(...color); doc.rect(x, y, Math.max(0.5, w * (pct / 100)), h, "F"); }
  };

  const addPageHeader = () => {
    doc.setFillColor(...C.blue); doc.rect(0, 0, W, 1.5, "F");
    doc.setFillColor(...C.white); doc.rect(0, 1.5, W, 10, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.navy);
    doc.text("TALENTAI — CANDIDATE SCREENING REPORT", M, 8);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...C.lgray);
    doc.text(jobTitle.slice(0, 50).toUpperCase(), M + 72, 8);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...C.navy);
    doc.text(`PAGE ${pageNum}`, W - M, 8, { align: "right" });
    doc.setDrawColor(...C.xlgray); doc.setLineWidth(0.3); doc.line(0, 11.5, W, 11.5);
  };

  const addPageFooter = () => {
    doc.setDrawColor(...C.xlgray); doc.setLineWidth(0.3); doc.line(M, H - 10, W - M, H - 10);
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.lgray);
    doc.text("CONFIDENTIAL — FOR INTERNAL USE ONLY · TalentAI Candidate Screening Report", M, H - 6.5);
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, W - M, H - 6.5, { align: "right" });
  };

  const sectionHeader = (label: string, color: RGB = C.navy) => {
    doc.setFillColor(...color); doc.rect(M, 0, CW, 0, "F"); // dummy to set color
    doc.setFillColor(...color); doc.rect(M, 0, CW, 8, "F");
    // re-draw at current y — caller positions y before calling
  };

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  // Navy header band
  doc.setFillColor(...C.navy); doc.rect(0, 0, W, 58, "F");
  doc.setFillColor(...C.blue); doc.rect(0, 0, 4, 58, "F");

  // Brand
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...C.blue);
  doc.text("TALENTAI", 12, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.lgray);
  doc.text("AI-POWERED RECRUITING PLATFORM", 12, 20);
  doc.setDrawColor(37, 55, 85); doc.setLineWidth(0.3); doc.line(12, 24, W - 12, 24);

  // Report title
  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(...C.white);
  doc.text("Candidate Screening", 12, 39);
  doc.setTextColor(...C.blue); doc.text("Report", 12, 50);

  // Position band (light gray)
  doc.setFillColor(...C.xlgray); doc.rect(0, 58, W, 30, "F");
  doc.setFillColor(...C.blue);   doc.rect(0, 58, 4, 30, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.lgray);
  doc.text("POSITION", 12, 67);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...C.navy);
  doc.text(jobTitle, 12, 77);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.gray);
  doc.text(
    `Screening Date: ${new Date(screeningDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
    12, 84
  );

  // Stat boxes
  const coverStats: { label: string; value: string; color: RGB }[] = [
    { label: "TOTAL APPLICANTS", value: `${totalApplicants}`,   color: C.blue },
    { label: "SHORTLISTED",      value: `${candidates.length}`, color: C.green },
    { label: "AVG SCORE",        value: `${avgScore}%`,         color: scoreRGB(avgScore) },
    { label: "TOP SCORE",        value: `${topScore}%`,         color: scoreRGB(topScore) },
  ];
  const bxW = CW / 4;
  coverStats.forEach(({ label, value, color }, i) => {
    const bx = M + i * bxW;
    doc.setFillColor(...C.white);   doc.rect(bx, 97, bxW - 3, 22, "F");
    doc.setFillColor(...color);     doc.rect(bx, 97, bxW - 3, 2,  "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...color);
    doc.text(value, bx + (bxW - 3) / 2, 110, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...C.lgray);
    doc.text(label, bx + (bxW - 3) / 2, 116, { align: "center" });
  });

  // Table of contents
  let y = 128;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.navy);
  doc.text("REPORT CONTENTS", M, y); y += 5;

  const toc = [
    ["01", "Executive Summary",          "Key hiring metrics and recommendation breakdown"],
    ["02", "Shortlisted Candidates",     `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} selected for interview`],
    ["03", "Candidate Detail Profiles",  "Per-candidate scores, strengths, gaps & interview questions"],
    ...(rejectedCandidates?.length
      ? [["04", "Not Shortlisted",       `${rejectedCandidates.length} candidate${rejectedCandidates.length !== 1 ? "s" : ""} — rejection reasons & improvement areas`]]
      : []),
  ];

  autoTable(doc, {
    startY: y, margin: { left: M, right: M },
    head: [], body: toc, theme: "plain",
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [...C.gray] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [...C.blue], cellWidth: 10 },
      1: { fontStyle: "bold", textColor: [...C.navy], cellWidth: 60 },
      2: { textColor: [...C.lgray] },
    },
    alternateRowStyles: { fillColor: [...C.xlgray] },
  });
  y = (doc as any).lastAutoTable?.finalY ?? y;
  y += 8;

  // Confidentiality notice
  doc.setFillColor(254, 243, 199); doc.rect(M, y, CW, 14, "F");
  doc.setDrawColor(253, 230, 138); doc.setLineWidth(0.3); doc.rect(M, y, CW, 14, "D");
  doc.setFillColor(...C.amber); doc.rect(M, y, 3, 14, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(120, 53, 15);
  doc.text("CONFIDENTIAL DOCUMENT", M + 7, y + 5.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(146, 64, 14);
  doc.text("This report contains sensitive candidate data intended for authorized HR personnel only.", M + 7, y + 10.5);

  addPageFooter();

  // ── EXECUTIVE SUMMARY ────────────────────────────────────────────────────────
  doc.addPage(); pageNum++;
  addPageHeader(); addPageFooter();
  y = 18;

  doc.setFillColor(...C.navy); doc.rect(M, y, CW, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.white);
  doc.text("01  EXECUTIVE SUMMARY", M + 4, y + 5.5);
  y += 12;

  // Key metric grid (2 rows × 3 cols)
  const sumMetrics: { label: string; value: string; color: RGB }[] = [
    { label: "Total Applicants",  value: `${totalApplicants}`,              color: C.blue },
    { label: "AI Shortlisted",    value: `${candidates.length}`,            color: C.green },
    { label: "Not Shortlisted",   value: `${rejectedCandidates?.length || 0}`, color: C.red },
    { label: "Average Score",     value: `${avgScore}%`,                    color: scoreRGB(avgScore) },
    { label: "Highest Score",     value: `${topScore}%`,                    color: scoreRGB(topScore) },
    { label: "Assessment Date",   value: new Date(screeningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), color: C.navy },
  ];
  const mW = CW / 3;
  sumMetrics.forEach(({ label, value, color }, i) => {
    const mx = M + (i % 3) * mW;
    const my = y + Math.floor(i / 3) * 18;
    doc.setFillColor(...C.xlgray); doc.rect(mx, my, mW - 3, 15, "F");
    doc.setFillColor(...color);    doc.rect(mx, my, mW - 3, 2,  "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...color);
    doc.text(value, mx + 5, my + 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.lgray);
    doc.text(label.toUpperCase(), mx + 5, my + 14);
  });
  y += 38;

  // Recommendation breakdown
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...C.navy);
  doc.text("RECOMMENDATION BREAKDOWN", M, y); y += 6;

  const recMap: Record<string, number> = {};
  candidates.forEach(c => { recMap[c.recommendation] = (recMap[c.recommendation] || 0) + 1; });

  [
    { label: "Strongly Recommended", color: C.green },
    { label: "Recommended",          color: C.blue  },
    { label: "Consider",             color: C.amber },
    { label: "Not Recommended",      color: C.red   },
  ].forEach(({ label, color }) => {
    const count = recMap[label] || 0;
    const pct   = candidates.length ? (count / candidates.length) * 100 : 0;
    doc.setFont("helvetica", "bold");   doc.setFontSize(8); doc.setTextColor(...C.navy);
    doc.text(label, M, y);
    doc.setFont("helvetica", "bold");   doc.setFontSize(8); doc.setTextColor(...color);
    doc.text(`${count}`, M + 62, y);
    drawBar(M + 70, y - 4, CW - 70, 5, pct, color);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.lgray);
    doc.text(`${Math.round(pct)}%`, W - M, y, { align: "right" });
    y += 9;
  });
  y += 5;

  // Shortlisted overview table
  if (candidates.length > 0) {
    if (y > H - 60) { doc.addPage(); pageNum++; addPageHeader(); addPageFooter(); y = 18; }
    doc.setFillColor(...C.navy); doc.rect(M, y, CW, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.white);
    doc.text("02  SHORTLISTED CANDIDATES", M + 4, y + 5.5);
    y += 10;

    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [["RNK", "CANDIDATE", "EMAIL", "SCORE", "DECISION"]],
      body: candidates.map(c => [`#${c.rank}`, displayName(c), c.email, `${c.finalScore}%`, c.recommendation]),
      theme: "plain",
      styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [...C.gray], lineColor: [...C.xlgray], lineWidth: 0.3 },
      headStyles: { fillColor: [...C.xlgray], textColor: [...C.navy], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [...C.navy], cellWidth: 13 },
        1: { fontStyle: "bold", textColor: [...C.navy] },
        2: { textColor: [...C.lgray], fontSize: 7.5 },
        3: { fontStyle: "bold", cellWidth: 17 },
        4: { fontStyle: "bold", cellWidth: 48 },
      },
      didParseCell: (d) => {
        if (d.section !== "body") return;
        if (d.column.index === 3) { const s = parseInt(d.cell.raw as string); d.cell.styles.textColor = scoreRGB(s); }
        if (d.column.index === 4) { d.cell.styles.textColor = recRGB(d.cell.raw as string); }
      },
    });
    y = (doc as any).lastAutoTable?.finalY ?? y;
    y += 8;
  }

  // Not shortlisted overview table
  if (rejectedCandidates && rejectedCandidates.length > 0) {
    if (y > H - 50) { doc.addPage(); pageNum++; addPageHeader(); addPageFooter(); y = 18; }
    doc.setFillColor(127, 29, 29); doc.rect(M, y, CW, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.white);
    doc.text("NOT SHORTLISTED — OVERVIEW", M + 4, y + 5.5);
    y += 10;

    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [["CANDIDATE", "EMAIL", "SCORE", "GAP FROM CUTOFF"]],
      body: rejectedCandidates.map(r => [
        r.candidateName || r.email.split("@")[0],
        r.email,
        `${r.finalScore}%`,
        `-${Math.round(r.closestShortlistScore - r.finalScore)} pts`,
      ]),
      theme: "plain",
      styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [...C.gray], lineColor: [...C.xlgray], lineWidth: 0.3 },
      headStyles: { fillColor: [254, 242, 242], textColor: [127, 29, 29], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [255, 250, 250] },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [...C.navy] },
        2: { fontStyle: "bold", textColor: [...C.red], cellWidth: 17 },
        3: { textColor: [...C.red], fontSize: 7.5, cellWidth: 32 },
      },
    });
    y = (doc as any).lastAutoTable?.finalY ?? y;
  }

  // ── CANDIDATE DETAIL PAGES ───────────────────────────────────────────────────
  if (candidates.length > 0) {
    doc.addPage(); pageNum++;
    addPageHeader(); addPageFooter();
    y = 18;
    doc.setFillColor(...C.navy); doc.rect(M, y, CW, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.white);
    doc.text("03  CANDIDATE DETAIL PROFILES", M + 4, y + 5.5);
    y += 12;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.gray);
    doc.text(`The following pages contain individual assessment reports for all ${candidates.length} shortlisted candidate${candidates.length !== 1 ? "s" : ""}.`, M, y);
  }

  candidates.forEach((c) => {
    doc.addPage(); pageNum++;
    addPageHeader(); addPageFooter();
    y = 18;

    const sc = scoreRGB(c.finalScore);
    const rc = recRGB(c.recommendation);

    // Header panel
    doc.setFillColor(...C.navy); doc.rect(M, y, CW, 32, "F");
    doc.setFillColor(...sc); doc.rect(M, y, 3.5, 32, "F");

    // Rank badge
    doc.setFillColor(...sc); doc.rect(M + 7, y + 5, 14, 12, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.white);
    doc.text(`#${c.rank}`, M + 14, y + 13, { align: "center" });

    // Name + email
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...C.white);
    doc.text(displayName(c), M + 26, y + 13);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.lgray);
    doc.text(c.email, M + 26, y + 20);

    // Recommendation pill
    doc.setFillColor(...rc); doc.rect(M + 26, y + 23, 50, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...C.white);
    doc.text(c.recommendation.toUpperCase(), M + 51, y + 27, { align: "center" });

    // Score circle
    const cx = W - M - 18;
    const cy = y + 16;
    doc.setFillColor(...sc); doc.circle(cx, cy, 13, "F");
    doc.setFillColor(20, 30, 55); doc.circle(cx, cy, 10.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...sc);
    doc.text(`${c.finalScore}`, cx, cy + 2, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...C.lgray);
    doc.text("/ 100", cx, cy + 7.5, { align: "center" });
    y += 37;

    // Evaluation summary
    doc.setFillColor(...C.xlgray); doc.rect(M, y, CW, 6, "F");
    doc.setFillColor(...C.blue); doc.rect(M, y, 3, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.navy);
    doc.text("EVALUATION SUMMARY", M + 6, y + 4.2);
    y += 8;
    const sumL = doc.splitTextToSize(c.summary, CW);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.gray);
    doc.text(sumL, M, y);
    y += sumL.length * 4.5 + 7;

    // Score breakdown
    if (y > H - 80) { doc.addPage(); pageNum++; addPageHeader(); addPageFooter(); y = 18; }
    doc.setFillColor(...C.xlgray); doc.rect(M, y, CW, 6, "F");
    doc.setFillColor(...C.blue); doc.rect(M, y, 3, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.navy);
    doc.text("SCORE BREAKDOWN", M + 6, y + 4.2);
    y += 9;

    [
      ["Skills",       c.breakdown.skillsScore],
      ["Experience",   c.breakdown.experienceScore],
      ["Education",    c.breakdown.educationScore],
      ["Projects",     c.breakdown.projectsScore],
      ["Availability", c.breakdown.availabilityScore],
    ].forEach(([label, score]) => {
      const bc = scoreRGB(score as number);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.navy);
      doc.text(label as string, M, y + 3.5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...bc);
      doc.text(`${score}%`, M + 30, y + 3.5);
      drawBar(M + 42, y, CW - 42 - 4, 5, score as number, bc);
      y += 8;
    });
    // Total row
    doc.setDrawColor(...C.xlgray); doc.setLineWidth(0.3); doc.line(M, y, M + CW, y);
    y += 3;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.navy);
    doc.text("COMPOSITE SCORE", M, y + 3.5);
    doc.setTextColor(...sc);
    doc.text(`${c.finalScore}%`, M + 30, y + 3.5);
    drawBar(M + 42, y, CW - 42 - 4, 6, c.finalScore, sc);
    y += 12;

    // Strengths & Gaps
    if (y > H - 55) { doc.addPage(); pageNum++; addPageHeader(); addPageFooter(); y = 18; }
    const colW = (CW - 4) / 2;

    doc.setFillColor(240, 253, 244); doc.rect(M, y, colW, 6, "F");
    doc.setFillColor(...C.green); doc.rect(M, y, 3, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.green);
    doc.text("STRENGTHS", M + 6, y + 4.2);

    doc.setFillColor(254, 242, 242); doc.rect(M + colW + 4, y, colW, 6, "F");
    doc.setFillColor(...C.red); doc.rect(M + colW + 4, y, 3, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.red);
    doc.text("SKILL GAPS", M + colW + 10, y + 4.2);
    y += 8;

    const maxSG = Math.min(Math.max(c.strengths.length, c.gaps.length), 5);
    for (let i = 0; i < maxSG; i++) {
      if (c.strengths[i]) {
        const sl = doc.splitTextToSize(`+ ${c.strengths[i]}`, colW - 4);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(21, 128, 61);
        doc.text(sl, M + 2, y);
      }
      if (c.gaps[i]) {
        const gl = doc.splitTextToSize(`- ${c.gaps[i]}`, colW - 4);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(185, 28, 28);
        doc.text(gl, M + colW + 6, y);
      }
      y += 6;
    }
    y += 4;

    // Interview questions
    if (c.interviewQuestions.length > 0) {
      if (y > H - 50) { doc.addPage(); pageNum++; addPageHeader(); addPageFooter(); y = 18; }
      doc.setFillColor(...C.xlgray); doc.rect(M, y, CW, 6, "F");
      doc.setFillColor(...C.blue); doc.rect(M, y, 3, 6, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.navy);
      doc.text("SUGGESTED INTERVIEW QUESTIONS", M + 6, y + 4.2);
      y += 9;

      c.interviewQuestions.slice(0, 6).forEach((q, qi) => {
        if (y > H - 22) return;
        doc.setFillColor(...C.blue); doc.rect(M, y - 1, 5, 5, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.white);
        doc.text(`${qi + 1}`, M + 2.5, y + 2.5, { align: "center" });
        const ql = doc.splitTextToSize(q, CW - 9);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.gray);
        doc.text(ql, M + 8, y + 2.5);
        y += ql.length * 4.5 + 4;
      });
    }
  });

  // ── NOT SHORTLISTED DETAIL PAGES ────────────────────────────────────────────
  if (rejectedCandidates && rejectedCandidates.length > 0) {
    doc.addPage(); pageNum++;
    addPageHeader(); addPageFooter();
    y = 18;
    doc.setFillColor(127, 29, 29); doc.rect(M, y, CW, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.white);
    doc.text("04  NOT SHORTLISTED — DETAIL PROFILES", M + 4, y + 5.5);
    y += 12;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.gray);
    doc.text(`Assessment summaries for ${rejectedCandidates.length} candidate${rejectedCandidates.length !== 1 ? "s" : ""} who did not meet the shortlist threshold, including improvement areas.`, M, y);

    rejectedCandidates.forEach((r) => {
      doc.addPage(); pageNum++;
      addPageHeader(); addPageFooter();
      y = 18;

      // Header
      doc.setFillColor(127, 29, 29); doc.rect(M, y, CW, 28, "F");
      doc.setFillColor(...C.red); doc.rect(M, y, 3.5, 28, "F");

      // Score circle
      const cx = W - M - 16; const cy = y + 14;
      doc.setFillColor(...C.red); doc.circle(cx, cy, 11, "F");
      doc.setFillColor(80, 20, 20); doc.circle(cx, cy, 8.5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...C.red);
      doc.text(`${r.finalScore}`, cx, cy + 2, { align: "center" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(248, 113, 113);
      doc.text("/ 100", cx, cy + 7, { align: "center" });

      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...C.white);
      doc.text(r.candidateName || r.email.split("@")[0], M + 8, y + 11);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(252, 165, 165);
      doc.text(r.email, M + 8, y + 18);
      doc.setFillColor(...C.red); doc.rect(M + 8, y + 21, 32, 5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...C.white);
      doc.text("NOT SHORTLISTED", M + 24, y + 24.5, { align: "center" });
      y += 34;

      // Gap callout
      const gap = r.scoreGap ?? Math.round(r.closestShortlistScore - r.finalScore);
      doc.setFillColor(254, 242, 242); doc.rect(M, y, CW, 12, "F");
      doc.setDrawColor(254, 202, 202); doc.setLineWidth(0.3); doc.rect(M, y, CW, 12, "D");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...C.red);
      doc.text(`${gap} POINTS BELOW SHORTLIST THRESHOLD`, M + 5, y + 5.5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(185, 28, 28);
      doc.text(`Required: ${r.closestShortlistScore}   ·   Candidate scored: ${r.finalScore}`, M + 5, y + 9.5);
      y += 16;

      // Rejection reason
      doc.setFillColor(...C.xlgray); doc.rect(M, y, CW, 6, "F");
      doc.setFillColor(...C.red); doc.rect(M, y, 3, 6, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.navy);
      doc.text("REJECTION REASON", M + 6, y + 4.2);
      y += 8;
      const rrl = doc.splitTextToSize(r.whyNotSelected, CW);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.gray);
      doc.text(rrl, M, y);
      y += rrl.length * 4.5 + 8;

      // Missing skills
      if (r.topMissingSkills?.length > 0) {
        if (y > H - 45) { doc.addPage(); pageNum++; addPageHeader(); addPageFooter(); y = 18; }
        doc.setFillColor(254, 242, 242); doc.rect(M, y, CW, 6, "F");
        doc.setFillColor(...C.red); doc.rect(M, y, 3, 6, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(127, 29, 29);
        doc.text("MISSING SKILLS", M + 6, y + 4.2);
        y += 9;
        const cols = 4;
        const sw = CW / cols;
        r.topMissingSkills.forEach((s, si) => {
          const sx = M + (si % cols) * sw;
          const sy = y + Math.floor(si / cols) * 10;
          doc.setFillColor(254, 226, 226); doc.rect(sx, sy - 1, sw - 3, 7, "F");
          doc.setDrawColor(252, 165, 165); doc.setLineWidth(0.3); doc.rect(sx, sy - 1, sw - 3, 7, "D");
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.red);
          doc.text(`✗ ${s}`, sx + 2, sy + 3.5);
        });
        y += Math.ceil(r.topMissingSkills.length / cols) * 10 + 4;
      }

      // Improvement suggestions
      if (r.improvementSuggestions?.length > 0) {
        if (y > H - 35) { doc.addPage(); pageNum++; addPageHeader(); addPageFooter(); y = 18; }
        doc.setFillColor(239, 246, 255); doc.rect(M, y, CW, 6, "F");
        doc.setFillColor(...C.blue); doc.rect(M, y, 3, 6, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.navy);
        doc.text("IMPROVEMENT AREAS", M + 6, y + 4.2);
        y += 9;
        r.improvementSuggestions.forEach((s, si) => {
          if (y > H - 18) return;
          doc.setFillColor(...C.blue); doc.rect(M, y - 0.5, 4.5, 4.5, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.white);
          doc.text(`${si + 1}`, M + 2.25, y + 3, { align: "center" });
          const il = doc.splitTextToSize(s, CW - 9);
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.gray);
          doc.text(il, M + 7.5, y + 3);
          y += il.length * 4.5 + 3;
        });
      }
    });
  }

  doc.save(`TalentAI-Screening-${jobTitle.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── System chrome components ─────────────────────────────────────────────────

function SysHeader({
  result, selectedIds, onExport, exporting, thinkingLog, onShowThinking, onEmailSelected,
}: {
  result: ScreeningResult;
  selectedIds: Set<string>;
  onExport: () => void;
  exporting: boolean;
  thinkingLog: { length: number };
  onShowThinking: () => void;
  onEmailSelected: () => void;
}) {
  const [clock, setClock] = useState(nowClock());
  useEffect(() => {
    const t = setInterval(() => setClock(nowClock()), 1000);
    return () => clearInterval(t);
  }, []);

  const hasThinking = ((thinkingLog?.length ?? 0) > 0) || (((result as ScreeningResult & { thinkingLog?: unknown[] }).thinkingLog?.length ?? 0) > 0);

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
        <span className="text-[10px] text-gray-400 font-mono">REPORT · FINAL</span>
      </div>

      <div className="flex items-center gap-2">
        {hasThinking && (
          <button
            onClick={onShowThinking}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-mono tracking-wider uppercase transition-colors rounded-sm"
          >
            <Brain className="w-3 h-3" />
            AI REASONING
            <span className="ml-0.5 px-1 py-px bg-purple-200 text-[9px] font-bold rounded">
              {typeof thinkingLog?.length === 'number' && thinkingLog.length > 0 ? thinkingLog.length : (result as ScreeningResult & { thinkingLog?: unknown[] }).thinkingLog?.length ?? 0}
            </span>
          </button>
        )}

        {selectedIds.size > 0 && (
          <>
            <button
              onClick={onEmailSelected}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-mono tracking-wider uppercase transition-colors rounded-sm"
            >
              <Mail className="w-3 h-3" /> EMAIL {selectedIds.size}
            </button>
            <button
              onClick={onExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-mono tracking-wider uppercase transition-colors rounded-sm"
            >
              {exporting
                ? <><Sparkles className="w-3 h-3 animate-spin" /> GENERATING...</>
                : <><Download className="w-3 h-3" /> EXPORT {selectedIds.size} PDF</>}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        <span className="text-[10px] font-mono text-gray-400">{clock}</span>
        <div className="w-px h-3.5 bg-gray-200" />
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] font-mono text-green-700 tracking-wider">REPORT LOADED</span>
        </div>
      </div>
    </div>
  );
}

function ReportBanner({ result, onBack }: { result: ScreeningResult; onBack: () => void }) {
  return (
    <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3.5 bg-gray-200" />
        <Link href="/results" className="text-[10px] font-mono text-gray-500 hover:text-gray-700 tracking-wider uppercase transition-colors">
          RESULTS
        </Link>
        <span className="text-gray-300 text-[10px]">/</span>
        <span className="text-[10px] font-mono text-gray-700 tracking-wider uppercase truncate max-w-[300px]">{result.jobTitle}</span>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
        <span className="flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          {result.totalApplicants} APPLICANTS
        </span>
        <div className="w-px h-3 bg-gray-200" />
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {new Date(result.screeningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
        </span>
        <div className="w-px h-3 bg-gray-200" />
        <span className="flex items-center gap-1.5 text-green-600">
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
    { label: "SHORTLISTED", value: result.shortlistSize,    unit: "",  icon: Trophy, accent: "#16a34a" },
    { label: "REJECTED",    value: result.rejectedCandidates?.length ?? 0, unit: "", icon: XCircle, accent: "#dc2626" },
    { label: "AVG SCORE",   value: avgScore,                unit: "%", icon: Activity, accent: scoreColor(avgScore) },
    { label: "TOP SCORE",   value: topScore,                unit: "%", icon: Sparkles, accent: scoreColor(topScore) },
    { label: "CONFIDENCE",  value: avgConf,                 unit: "%", icon: Shield },
    { label: "DURATION",    value: (result.processingTimeMs / 1000).toFixed(1), unit: "s", icon: Clock },
  ];

  return (
    <div className="bg-white border-b border-gray-200 flex items-stretch flex-shrink-0">
      {metrics.map(({ label, value, unit, icon: Icon, accent }, i) => (
        <React.Fragment key={label}>
          {i > 0 && <div className="w-px bg-gray-200 self-stretch" />}
          <div className="flex-1 px-4 py-2.5 flex items-center gap-2.5 min-w-0">
            <Icon className="w-3 h-3 flex-shrink-0" style={{ color: accent ?? "#6b7280" }} />
            <div className="min-w-0">
              <p className="text-[8px] font-semibold uppercase tracking-widest text-gray-500 leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold font-mono leading-none" style={{ color: accent ?? "#374151" }}>
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
    <div className={`flex flex-col overflow-hidden border border-gray-200 rounded-sm ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-4 bg-blue-500 rounded-sm" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-gray-700">{title}</span>
          {badge !== undefined && (
            <span
              className="text-[9px] font-bold px-1.5 py-px rounded-sm font-mono"
              style={{ background: `${badgeColor ?? "#3b82f6"}15`, color: badgeColor ?? "#1d4ed8", border: `1px solid ${badgeColor ?? "#3b82f6"}30` }}
            >
              {badge}
            </span>
          )}
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>
      <div className="flex-1 bg-white overflow-hidden">{children}</div>
    </div>
  );
}

// ─── Micro components ─────────────────────────────────────────────────────────

function ScoreBar({ value }: { value: number }) {
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 bg-gray-200 overflow-hidden flex-shrink-0">
        <div className="h-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-bold font-mono tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const cfg = REC_CONFIG[rec] ?? { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", dot: "#94a3b8", short: rec };
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
  const color = score >= 85 ? "#16a34a" : score >= 65 ? "#d97706" : "#dc2626";
  const bg    = score >= 85 ? "#dcfce7" : score >= 65 ? "#fef3c7" : "#fee2e2";
  const label = score >= 85 ? "HIGH"    : score >= 65 ? "MED"     : "LOW";
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-px font-mono tracking-wider"
      style={{ background: bg, color, border: `1px solid ${color}40` }}
    >
      <Shield className="w-2 h-2" />{score}% {label}
    </span>
  );
}

function StageSelect({ stage, onChange }: { stage: PipelineStage; onChange: (s: PipelineStage) => void }) {
  const p = PIPELINE[stage];
  const lightBg = stage === "new" ? "#f1f5f9" : stage === "interview" ? "#dbeafe" : stage === "hold" ? "#fef3c7" : stage === "offer" ? "#ede9fe" : stage === "hired" ? "#dcfce7" : "#fee2e2";
  return (
    <div className="relative inline-flex">
      <select
        value={stage}
        onChange={e => onChange(e.target.value as PipelineStage)}
        onClick={e => e.stopPropagation()}
        className="appearance-none text-[10px] font-bold font-mono pl-2 pr-5 py-0.5 cursor-pointer focus:outline-none tracking-wider uppercase"
        style={{ background: lightBg, color: p.color, border: `1px solid ${p.border}50` }}
      >
        {(Object.entries(PIPELINE) as [PipelineStage, typeof PIPELINE[PipelineStage]][]).map(([v, s]) => (
          <option key={v} value={v} style={{ background: "#ffffff", color: s.color }}>{s.label}</option>
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
        <div className="border-t border-gray-200 bg-white">
          {/* Sub-nav */}
          <div className="flex border-b border-gray-200 bg-white">
            <div className="w-9 flex-shrink-0 border-r border-gray-200" />
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
                  borderBottomColor: tab === id ? "#3b82f6" : "transparent",
                  color: tab === id ? "#3b82f6" : "#6b7280",
                  background: tab === id ? "#eff6ff" : "transparent",
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
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">EVALUATION SUMMARY</p>
                    <p className="text-xs leading-relaxed text-gray-600 font-mono">{candidate.summary}</p>
                  </div>

                  {/* Score breakdown */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">SCORE BREAKDOWN</p>
                    <div className="border border-gray-200">
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
                          style={{ borderTop: i > 0 ? "1px solid #e5e7eb" : "none", background: i % 2 === 0 ? "#f9fafb" : "white" }}
                        >
                          <span className="text-[10px] font-mono font-bold text-gray-500 w-24 flex-shrink-0">{label}</span>
                          <ScoreBar value={val as number} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths & Gaps */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-green-200 bg-green-50">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-green-600 px-3 py-2 border-b border-green-200">STRENGTHS</p>
                      <ul className="p-3 space-y-1.5">
                        {candidate.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-green-600 font-mono">
                            <span className="text-green-600 flex-shrink-0 mt-px">+</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border border-red-200 bg-red-50">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 px-3 py-2 border-b border-red-200">GAPS</p>
                      <ul className="p-3 space-y-1.5">
                        {candidate.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-red-600 font-mono">
                            <span className="text-red-600 flex-shrink-0 mt-px">-</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Skill analysis */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">SKILL ANALYSIS</p>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skillGapAnalysis.matched.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 font-mono font-bold"
                          style={{ background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" }}>✓ {s}</span>
                      ))}
                      {candidate.skillGapAnalysis.missing.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 font-mono font-bold"
                          style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>✗ {s}</span>
                      ))}
                      {candidate.skillGapAnalysis.bonus.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 font-mono font-bold"
                          style={{ background: "#dbeafe", color: "#2563eb", border: "1px solid #bfdbfe" }}>+ {s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Evaluation notes */}
                  {candidate.reasoning && (
                    <div className="border border-gray-200">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 px-3 py-2 border-b border-gray-200 bg-gray-50">EVALUATION NOTES</p>
                      <p className="text-[11px] leading-relaxed text-gray-600 font-mono p-3">{candidate.reasoning}</p>
                    </div>
                  )}

                  {/* Risk flags */}
                  {candidate.riskFlags?.length > 0 && (
                    <div className="border border-yellow-200 bg-yellow-50">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-600 px-3 py-2 border-b border-yellow-200">RISK FLAGS</p>
                      <div className="p-3 flex flex-wrap gap-1.5">
                        {candidate.riskFlags.map((r, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 font-mono font-bold"
                            style={{ background: "#fef3c7", color: "#d97706", border: "1px solid #fde68a" }}>
                            <AlertTriangle className="w-2.5 h-2.5" />{r.type.replace(/_/g, " ").toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Radar chart */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-3">SCORE PROFILE</p>
                  <div className="border border-gray-200 bg-white p-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radar}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 10 }} />
                          <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} />
                          <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 2, fontSize: 11, color: "#6b7280" }} />
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
                  <div key={i} className="flex gap-3 p-3 border border-gray-200" style={{ background: i % 2 === 0 ? "#f9fafb" : "white" }}>
                    <span className="font-bold text-blue-600 font-mono text-sm flex-shrink-0 w-5">{i + 1}.</span>
                    <p className="text-xs font-mono leading-relaxed text-gray-600">{q}</p>
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
                      <div key={i} className="border border-yellow-200 bg-yellow-50">
                        <p className="text-[10px] font-bold font-mono text-yellow-600 uppercase tracking-wider px-3 py-2 border-b border-yellow-200">{b.type.replace(/_/g, " ")}</p>
                        <div className="p-3 space-y-1.5">
                          <p className="text-[11px] font-mono text-gray-600">Signal: {b.signal}</p>
                          <p className="text-[11px] font-mono text-blue-600">Recommendation: {b.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-4 border border-green-200 bg-green-50">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-[10px] font-bold font-mono text-green-600 uppercase tracking-wider">NO BIAS SIGNALS DETECTED</p>
                      <p className="text-[11px] font-mono text-gray-600 mt-0.5">Assessment passed automated bias audit.</p>
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

// ─── Comparison modal ─────────────────────────────────────────────────────────
type CompareEntry =
  | { kind: "shortlisted"; candidate: CandidateScore }
  | { kind: "rejected";    candidate: RejectedCandidate };

function CompareModal({ entries, onClose }: { entries: CompareEntry[]; onClose: () => void }) {
  if (entries.length < 2) return null;

  const BREAKDOWN_KEYS: Array<[string, keyof CandidateScore["breakdown"]]> = [
    ["SKILLS",       "skillsScore"      ],
    ["EXPERIENCE",   "experienceScore"  ],
    ["EDUCATION",    "educationScore"   ],
    ["PROJECTS",     "projectsScore"    ],
    ["AVAILABILITY", "availabilityScore"],
  ];

  function bestBreakdownScore(key: keyof CandidateScore["breakdown"]): number {
    let best = -1;
    for (const e of entries) {
      if (e.kind === "shortlisted") {
        const v = e.candidate.breakdown[key];
        if (v > best) best = v;
      }
    }
    return best;
  }

  const bestFinal = Math.max(...entries.map(e => e.candidate.finalScore));
  const shortlistedCount = entries.filter(e => e.kind === "shortlisted").length;
  const hasCrossPool = entries.some(e => e.kind === "shortlisted") && entries.some(e => e.kind === "rejected");

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="min-h-screen flex items-start justify-center p-4 py-8">
        <div className="relative w-full max-w-7xl bg-white shadow-2xl border border-gray-200">

          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-[#0f172a] border-b border-[#1e293b]">
            <div className="flex items-center gap-3">
              <Scale className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] font-bold font-mono tracking-widest text-white uppercase">CANDIDATE COMPARISON</span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-blue-600 text-white">
                {entries.length} CANDIDATES
              </span>
              {hasCrossPool && (
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-600 text-white">
                  CROSS-POOL · SHORTLISTED vs REJECTED
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Columns */}
          <div
            className="grid divide-x divide-gray-200"
            style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}
          >
            {entries.map((entry, col) => {
              const isShortlisted = entry.kind === "shortlisted";
              const cand = entry.candidate;
              const name = cand.candidateName?.trim() || cand.email.split("@")[0];
              const isBestFinal = cand.finalScore === bestFinal && entries.length > 1;

              return (
                <div key={col} className="flex flex-col min-w-0">

                  {/* Candidate header */}
                  <div
                    className="p-4 border-b border-gray-200 flex-shrink-0"
                    style={{ background: isShortlisted ? "#f0fdf4" : "#fef2f2" }}
                  >
                    <div className="mb-2.5">
                      <span
                        className="text-[9px] font-bold font-mono px-2 py-0.5 uppercase tracking-wider"
                        style={isShortlisted
                          ? { background: "#dcfce7", color: "#16a34a", border: "1px solid #86efac" }
                          : { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}
                      >
                        {isShortlisted ? "✓ SHORTLISTED" : "✗ NOT SHORTLISTED"}
                      </span>
                    </div>
                    <p className="text-sm font-bold font-mono text-gray-900 truncate" title={name}>{name}</p>
                    <p className="text-[10px] font-mono text-gray-500 truncate mt-0.5">{cand.email}</p>
                    <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                      {isShortlisted && (
                        <span
                          className="text-[10px] font-bold font-mono px-2 py-0.5"
                          style={{
                            background: (cand as CandidateScore).rank <= 3 ? "#fef3c7" : "#f3f4f6",
                            color:      (cand as CandidateScore).rank <= 3 ? "#d97706" : "#6b7280",
                          }}
                        >
                          RANK #{(cand as CandidateScore).rank}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-mono tabular-nums" style={{ color: scoreColor(cand.finalScore) }}>
                          {cand.finalScore}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">/100</span>
                      </div>
                      {isBestFinal && (
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200">HIGHEST</span>
                      )}
                    </div>
                    {isShortlisted && (cand as CandidateScore).recommendation && (
                      <div className="mt-2.5">
                        <RecBadge rec={(cand as CandidateScore).recommendation} />
                      </div>
                    )}
                    {!isShortlisted && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-red-600">
                        <TrendingDown className="w-3 h-3" />
                        {Math.round((cand as RejectedCandidate).closestShortlistScore - cand.finalScore)} PTS BELOW CUTOFF
                      </div>
                    )}
                  </div>

                  {/* Score breakdown — shortlisted only */}
                  {isShortlisted && (
                    <div className="border-b border-gray-200">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-[9px] font-bold font-mono text-gray-500 uppercase tracking-wider">SCORE BREAKDOWN</span>
                      </div>
                      <div className="p-3 space-y-2.5">
                        {BREAKDOWN_KEYS.map(([label, key]) => {
                          const val = (cand as CandidateScore).breakdown[key];
                          const best = bestBreakdownScore(key);
                          const isBest = val === best && shortlistedCount > 1;
                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[9px] font-mono text-gray-400 uppercase">{label}</span>
                                {isBest && <span className="text-[8px] font-bold font-mono text-amber-500">BEST</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-100 overflow-hidden">
                                  <div className="h-full" style={{ width: `${val}%`, background: scoreColor(val) }} />
                                </div>
                                <span className="text-[11px] font-mono font-bold w-7 text-right tabular-nums" style={{ color: scoreColor(val) }}>{val}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shortlisted: strengths & gaps */}
                  {isShortlisted && (
                    <div className="border-b border-gray-200">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-[9px] font-bold font-mono text-gray-500 uppercase tracking-wider">STRENGTHS & GAPS</span>
                      </div>
                      <div className="p-3 space-y-3">
                        {(cand as CandidateScore).strengths?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold font-mono text-green-600 mb-1.5">STRENGTHS</p>
                            <ul className="space-y-1">
                              {(cand as CandidateScore).strengths.slice(0, 4).map((s, i) => (
                                <li key={i} className="text-[10px] font-mono text-gray-600 flex items-start gap-1.5">
                                  <span className="text-green-500 flex-shrink-0 mt-px">+</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(cand as CandidateScore).gaps?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold font-mono text-red-600 mb-1.5">GAPS</p>
                            <ul className="space-y-1">
                              {(cand as CandidateScore).gaps.slice(0, 3).map((g, i) => (
                                <li key={i} className="text-[10px] font-mono text-gray-600 flex items-start gap-1.5">
                                  <span className="text-red-500 flex-shrink-0 mt-px">-</span>{g}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shortlisted: skills */}
                  {isShortlisted && (cand as CandidateScore).skillGapAnalysis && (
                    <div className="border-b border-gray-200">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-[9px] font-bold font-mono text-gray-500 uppercase tracking-wider">SKILLS</span>
                      </div>
                      <div className="p-3 flex flex-wrap gap-1">
                        {(cand as CandidateScore).skillGapAnalysis.matched.slice(0, 6).map(s => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 font-mono font-bold"
                            style={{ background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" }}>✓ {s}</span>
                        ))}
                        {(cand as CandidateScore).skillGapAnalysis.missing.slice(0, 4).map(s => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 font-mono font-bold"
                            style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>✗ {s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shortlisted: AI summary */}
                  {isShortlisted && (cand as CandidateScore).summary && (
                    <div className="border-b border-gray-200">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-[9px] font-bold font-mono text-gray-500 uppercase tracking-wider">AI SUMMARY</span>
                      </div>
                      <p className="text-[10px] font-mono leading-relaxed text-gray-600 p-3">
                        {(cand as CandidateScore).summary}
                      </p>
                    </div>
                  )}

                  {/* Rejected: why not selected */}
                  {!isShortlisted && (
                    <>
                      <div className="border-b border-gray-200">
                        <div className="px-3 py-2 bg-red-50 border-b border-red-200">
                          <span className="text-[9px] font-bold font-mono text-red-600 uppercase tracking-wider flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> WHY NOT SELECTED
                          </span>
                        </div>
                        <p className="text-[10px] font-mono leading-relaxed text-gray-600 p-3">
                          {(cand as RejectedCandidate).whyNotSelected}
                        </p>
                      </div>
                      {(cand as RejectedCandidate).topMissingSkills?.length > 0 && (
                        <div className="border-b border-gray-200">
                          <div className="px-3 py-2 bg-red-50 border-b border-red-200">
                            <span className="text-[9px] font-bold font-mono text-red-600 uppercase tracking-wider">MISSING SKILLS</span>
                          </div>
                          <div className="p-3 flex flex-wrap gap-1">
                            {(cand as RejectedCandidate).topMissingSkills.map(s => (
                              <span key={s} className="text-[9px] px-1.5 py-0.5 font-mono font-bold"
                                style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>✗ {s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(cand as RejectedCandidate).improvementSuggestions?.length > 0 && (
                        <div className="border-b border-gray-200">
                          <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                            <span className="text-[9px] font-bold font-mono text-blue-600 uppercase tracking-wider flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" /> HOW TO IMPROVE
                            </span>
                          </div>
                          <ul className="p-3 space-y-1.5">
                            {(cand as RejectedCandidate).improvementSuggestions.map((s, i) => (
                              <li key={i} className="text-[10px] font-mono text-gray-600 flex items-start gap-1.5">
                                <span className="text-blue-500 flex-shrink-0 mt-px">→</span>{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Candidate table row ───────────────────────────────────────────────────────
function CandidateRow({
  candidate, isSelected, onSelect, stage, onStageChange, isExpanded, onToggle, index, onEmail,
}: {
  candidate: CandidateScore; isSelected: boolean; onSelect: (id: string) => void;
  stage: PipelineStage; onStageChange: (id: string, s: PipelineStage) => void;
  isExpanded: boolean; onToggle: (id: string) => void; index: number;
  onEmail: (c: CandidateScore) => void;
}) {
  const isTop3  = candidate.rank <= 3;
  const rowBg   = isExpanded ? "#eff6ff" : isSelected ? "#f0f9ff" : index % 2 === 0 ? "#ffffff" : "#f9fafb";

  return (
    <>
      <tr
        className="group cursor-pointer transition-colors"
        style={{ borderBottom: "1px solid #e5e7eb", background: rowBg }}
        onClick={() => onToggle(candidate.candidateId)}
      >
        {/* Checkbox */}
        <td className="pl-4 pr-3 py-3 w-9" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onSelect(candidate.candidateId)}
            className="w-3.5 h-3.5 flex items-center justify-center transition-all flex-shrink-0"
            style={{
              background: isSelected ? "#3b82f6" : "transparent",
              border: `1px solid ${isSelected ? "#3b82f6" : "#d1d5db"}`,
            }}
          >
            {isSelected && <Check className="w-2 h-2 text-white" />}
          </button>
        </td>

        {/* Rank */}
        <td className="px-3 py-3 w-10">
          <span className="text-xs font-bold font-mono tabular-nums" style={{ color: isTop3 ? "#d97706" : "#6b7280" }}>
            {isTop3 ? `#${candidate.rank}` : `${candidate.rank}`}
          </span>
        </td>

        {/* Candidate */}
        <td className="px-3 py-3">
          <p className="text-xs font-semibold font-mono text-gray-900">{displayName(candidate)}</p>
          <p className="text-[10px] font-mono text-gray-500 mt-0.5">{candidate.email}</p>
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

        {/* Actions */}
        <td className="pl-2 pr-4 py-3 w-16" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEmail(candidate)}
              className="p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
              title="Send email"
            >
              <Mail className="w-3 h-3" />
            </button>
            <ChevronRight
              className="w-3.5 h-3.5 transition-transform cursor-pointer"
              style={{ color: "#9ca3af", transform: isExpanded ? "rotate(90deg)" : "none" }}
              onClick={() => onToggle(candidate.candidateId)}
            />
          </div>
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
        style={{ borderBottom: "1px solid #e5e7eb", background: index % 2 === 0 ? "#fef2f2" : "#fff5f5" }}
        onClick={() => setOpen(v => !v)}
      >
        <td className="pl-4 pr-3 py-2.5 w-9" />
        <td className="px-3 py-2.5 w-10">
          <span className="text-xs font-bold font-mono tabular-nums text-red-400">
            {rejected.rank != null ? `#${rejected.rank}` : `${rejected.finalScore}`}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <p className="text-xs font-mono text-gray-600">{rejected.candidateName || rejected.email.split("@")[0]}</p>
          <p className="text-[10px] font-mono text-gray-400 mt-0.5">{rejected.email}</p>
        </td>
        <td className="px-3 py-2.5 w-32">
          <ScoreBar value={rejected.finalScore} />
        </td>
        <td className="px-3 py-2.5 w-40">
          <span className="text-[10px] font-mono text-gray-500">
            -{rejected.scoreGap ?? Math.round(rejected.closestShortlistScore - rejected.finalScore)} PTS FROM CUTOFF
          </span>
        </td>
        <td className="px-3 py-2.5 w-32" />
        <td className="pl-2 pr-4 py-2.5 w-8">
          <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ color: "#9ca3af", transform: open ? "rotate(90deg)" : "none" }} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="border-t border-red-200 bg-red-50 p-4 space-y-4">
              <div className="border border-red-200 bg-white">
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 px-3 py-2 border-b border-red-200 flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3" /> REJECTION REASON
                </p>
                <p className="text-[11px] font-mono leading-relaxed text-gray-600 p-3">{rejected.whyNotSelected}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {rejected.topMissingSkills?.length > 0 && (
                  <div className="border border-red-200">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 px-3 py-2 border-b border-red-200 bg-red-50">MISSING SKILLS</p>
                    <div className="p-3 flex flex-wrap gap-1">
                      {rejected.topMissingSkills.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 font-mono font-bold"
                          style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>✗ {s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {rejected.improvementSuggestions?.length > 0 && (
                  <div className="border border-blue-200">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-600 px-3 py-2 border-b border-blue-200 bg-blue-50 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> IMPROVEMENT AREAS
                    </p>
                    <ul className="p-3 space-y-1">
                      {rejected.improvementSuggestions.map((s, i) => (
                        <li key={i} className="text-[11px] font-mono flex items-start gap-1.5 text-gray-600">
                          <span className="text-blue-600">→</span>{s}
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
      <div className="border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
          <div className="w-1 h-3 bg-blue-500" />
          <span className="text-[9px] font-bold tracking-widest uppercase text-gray-700">{title}</span>
        </div>
        <div className="bg-white p-3">{children}</div>
      </div>
    );
  }

  function DataRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-[11px] font-bold font-mono" style={{ color: accent ?? "#6b7280" }}>{value}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SidePanel title="COHORT ANALYTICS">
        <DataRow label="SCREENED"    value={result.totalApplicants} />
        <DataRow label="SHORTLISTED" value={result.shortlistSize} accent="#16a34a" />
        <DataRow label="REJECTED"    value={result.rejectedCandidates?.length ?? 0} accent="#dc2626" />
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
                  <div className="h-1 bg-gray-200 overflow-hidden">
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
                <XAxis dataKey="range" tick={{ fill: "#6b7280", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 2, fontSize: 10, color: "#6b7280" }}
                  formatter={(v: number) => [`${v} candidates`]}
                />
                <Bar dataKey="count" radius={[1, 1, 0, 0]}>
                  {dist.map((e, i) => {
                    const [lo] = e.range.split("-").map(Number);
                    return <Cell key={i} fill={lo >= 80 ? "#16a34a" : lo >= 65 ? "#3b82f6" : lo >= 50 ? "#d97706" : "#6b7280"} />;
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
                style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}
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
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    recipients: { name: string; email: string }[];
  }>({ open: false, recipients: [] });
  const [candidatePage, setCandidatePage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const CAND_PAGE_SIZE = 10;

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

  useEffect(() => { setCandidatePage(1); }, [filter, sortBy]);

  const handleEmailSelected = () => {
    if (!result) return;
    const selected = result.shortlist.filter(c => selectedIds.has(c.candidateId));
    const recipients = selected.map(c => ({ name: displayName(c), email: c.email }));
    setEmailModal({ open: true, recipients });
  };

  const handleEmailSingle = (c: { candidateName?: string; email: string }) => {
    const name = c.candidateName?.trim() || c.email.split("@")[0];
    setEmailModal({ open: true, recipients: [{ name, email: c.email }] });
  };

  const handleExport = async () => {
    if (!result) return;
    const candidates = result.shortlist.filter(c => selectedIds.has(c.candidateId));
    if (!candidates.length) return;
    setExporting(true);
    try {
      await exportPDF(candidates, result.jobTitle, result.screeningDate, result.rejectedCandidates);
      setSelectedIds(new Set());
    }
    catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !result) {
    return (
      <div className="min-h-screen bg-[#eef1f5] font-sans flex flex-col">
        {/* Skeleton header */}
        <div className="h-9 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
          <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
          <div className="w-32 h-2 bg-gray-200 rounded animate-pulse" />
          <div className="w-px h-3.5 bg-gray-200" />
          <div className="w-48 h-2 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white border-b border-gray-200 h-10" />
        <div className="bg-white border-b border-gray-200 h-12" />
        <div className="flex-1 p-5 space-y-4">
          <div className="h-8 bg-gray-200 border border-gray-200 animate-pulse" />
          <div className="h-80 bg-gray-200 border border-gray-200 animate-pulse" />
        </div>
        <div className="h-7 bg-white border-t border-gray-200" />
      </div>
    );
  }

  const allSelected  = result.shortlist.length > 0 && selectedIds.size === result.shortlist.length;
  const REC_FILTERS: RecFilter[] = ["All", "Strongly Recommended", "Recommended", "Consider", "Not Recommended"];

  const totalCandidatePages = Math.ceil(filtered.length / CAND_PAGE_SIZE);
  const pagedFiltered = filtered.slice((candidatePage - 1) * CAND_PAGE_SIZE, candidatePage * CAND_PAGE_SIZE);
  const totalRejectedPages = Math.ceil((result.rejectedCandidates?.length ?? 0) / CAND_PAGE_SIZE);
  const pagedRejected = (result.rejectedCandidates ?? []).slice((rejectedPage - 1) * CAND_PAGE_SIZE, rejectedPage * CAND_PAGE_SIZE);

  const effectiveThinkingLog = thinkingLog?.length ? thinkingLog : (result.thinkingLog ?? []);

  return (
    <div className="min-h-screen bg-[#eef1f5] font-sans flex flex-col">
      {/* System header */}
      <SysHeader
        result={result}
        selectedIds={selectedIds}
        onExport={handleExport}
        exporting={exporting}
        thinkingLog={effectiveThinkingLog}
        onShowThinking={() => setShowThinkingModal(true)}
        onEmailSelected={handleEmailSelected}
      />

      {/* Report banner */}
      <ReportBanner result={result} onBack={() => window.history.back()} />

      {/* Intel strip */}
      <IntelStrip result={result} />

      {/* Main content */}
      <div className="flex-1 p-4 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
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
                  className="text-[10px] font-mono font-bold px-2 py-1 bg-white border border-gray-200 text-gray-700 focus:outline-none uppercase tracking-wider"
                >
                  <option value="score">SORT: SCORE</option>
                  <option value="confidence">SORT: CONFIDENCE</option>
                  <option value="skills">SORT: SKILLS</option>
                </select>
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 border border-gray-200 bg-white text-gray-600 hover:text-gray-800 transition-colors uppercase tracking-wider"
                >
                  {allSelected ? <><CheckSquare className="w-3 h-3" /> DESELECT</> : <><Square className="w-3 h-3" /> SELECT ALL</>}
                </button>
              </div>
            }
          >
            {/* Filter bar */}
            <div className="flex items-center gap-px px-4 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
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
                      background: active ? (cfg ? cfg.bg : "#f3f4f6") : "transparent",
                      color:      active ? (cfg ? cfg.color : "#374151") : "#6b7280",
                      borderBottom: `2px solid ${active ? (cfg ? cfg.color : "#3b82f6") : "transparent"}`,
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
                  <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                    <th className="pl-4 pr-3 py-2.5 w-9" />
                    <th className="px-3 py-2.5 w-10 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 font-mono">RNK</th>
                    <th className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 font-mono">CANDIDATE</th>
                    <th className="px-3 py-2.5 w-32 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 font-mono">SCORE</th>
                    <th className="px-3 py-2.5 w-40 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 font-mono">DECISION</th>
                    <th className="px-3 py-2.5 w-32 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 font-mono">PIPELINE</th>
                    <th className="pl-2 pr-4 py-2.5 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {pagedFiltered.map((c, i) => (
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
                      onEmail={handleEmailSingle}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Candidate pagination */}
            {totalCandidatePages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-gray-50">
                <span className="text-[10px] font-mono text-gray-500">
                  SHOWING {(candidatePage - 1) * CAND_PAGE_SIZE + 1}–{Math.min(candidatePage * CAND_PAGE_SIZE, filtered.length)} OF {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={candidatePage <= 1}
                    onClick={() => setCandidatePage(p => p - 1)}
                    className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← PREV
                  </button>
                  <span className="px-3 py-1 text-[10px] font-mono font-bold text-gray-700 bg-white border border-gray-200">
                    {candidatePage} / {totalCandidatePages}
                  </span>
                  <button
                    disabled={candidatePage >= totalCandidatePages}
                    onClick={() => setCandidatePage(p => p + 1)}
                    className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    NEXT →
                  </button>
                </div>
              </div>
            )}

            {/* Not shortlisted */}
            {result.rejectedCandidates?.length > 0 && (
              <>
                <button
                  onClick={() => setShowRejected(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest border-t border-gray-200 transition-colors"
                  style={{ background: showRejected ? "#f3f4f6" : "#f9fafb", color: "#6b7280" }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3 h-3 text-[#ef4444]" />
                    <span className="text-[#6b7280]">NOT SHORTLISTED</span>
                    <span className="px-1.5 py-px text-[9px] font-mono font-bold" style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid #fecaca" }}>
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
                          {pagedRejected.map((r, i) => (
                            <RejectedRow key={r.candidateId} rejected={r} index={i} />
                          ))}
                        </tbody>
                      </table>
                      {totalRejectedPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-red-200 bg-red-50">
                          <span className="text-[10px] font-mono text-red-600">
                            SHOWING {(rejectedPage - 1) * CAND_PAGE_SIZE + 1}–{Math.min(rejectedPage * CAND_PAGE_SIZE, result.rejectedCandidates.length)} OF {result.rejectedCandidates.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              disabled={rejectedPage <= 1}
                              onClick={() => setRejectedPage(p => p - 1)}
                              className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              ← PREV
                            </button>
                            <span className="px-3 py-1 text-[10px] font-mono font-bold text-red-700 bg-white border border-red-200">
                              {rejectedPage} / {totalRejectedPages}
                            </span>
                            <button
                              disabled={rejectedPage >= totalRejectedPages}
                              onClick={() => setRejectedPage(p => p + 1)}
                              className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              NEXT →
                            </button>
                          </div>
                        </div>
                      )}
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
      <div className="h-7 bg-white border-t border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 select-none">
        {[
          { icon: Database, label: "RECORDS",  value: `${result.shortlistSize} / ${result.totalApplicants}` },
          { icon: Filter,   label: "FILTER",   value: filter === "All" ? "NONE" : REC_CONFIG[filter]?.short ?? filter },
          { icon: Activity, label: "AVG SCORE",value: `${result.shortlist.length ? Math.round(result.shortlist.reduce((a,c)=>a+c.finalScore,0)/result.shortlist.length) : 0}%` },
          { icon: Server,   label: "ENGINE",   value: "GEMINI 2.5 FLASH" },
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

      {/* AI Thinking Review Modal */}
      <AIThinkingReviewModal
        isOpen={showThinkingModal}
        onClose={() => setShowThinkingModal(false)}
        thinkingLog={effectiveThinkingLog}
        jobTitle={result.jobTitle}
        screeningDate={result.screeningDate}
        totalApplicants={result.totalApplicants}
      />

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModal.open}
        onClose={() => setEmailModal({ open: false, recipients: [] })}
        recipients={emailModal.recipients}
        jobTitle={result.jobTitle}
        context="shortlist"
      />
    </div>
  );
}
