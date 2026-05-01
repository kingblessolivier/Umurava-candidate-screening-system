"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CandidateCheckbox } from "./bulkoperations";
import type { ScreeningStatus } from "@/types";
import {
  Users, TrendingUp, CheckCircle2, Target, ChevronRight,
  Inbox, Bot, ListChecks, CalendarDays, MessageSquare,
  Send, UserCheck, UserX, type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

interface StageConfig {
  id: ScreeningStatus;
  label: string;
  Icon: ComponentType<LucideProps>;
  accentColor: string;
  bgColor: string;
  countBg: string;
  countText: string;
  tagBg: string;
  tagText: string;
}

const STAGES: StageConfig[] = [
  {
    id: "pending",
    label: "Applied",
    Icon: Inbox,
    accentColor: "#64748b",
    bgColor: "#f8fafc",
    countBg: "#e2e8f0",
    countText: "#334155",
    tagBg: "#f1f5f9",
    tagText: "#475569",
  },
  {
    id: "screening",
    label: "AI Screening",
    Icon: Bot,
    accentColor: "#0284c7",
    bgColor: "#f0f9ff",
    countBg: "#e0f2fe",
    countText: "#0369a1",
    tagBg: "#e0f2fe",
    tagText: "#0284c7",
  },
  {
    id: "screened",
    label: "Shortlisted",
    Icon: ListChecks,
    accentColor: "#0d9488",
    bgColor: "#f0fdfa",
    countBg: "#ccfbf1",
    countText: "#0f766e",
    tagBg: "#ccfbf1",
    tagText: "#0d9488",
  },
  {
    id: "interview_scheduled",
    label: "Interview",
    Icon: CalendarDays,
    accentColor: "#d97706",
    bgColor: "#fffbeb",
    countBg: "#fef3c7",
    countText: "#92400e",
    tagBg: "#fef3c7",
    tagText: "#b45309",
  },
  {
    id: "interviewed",
    label: "Interviewed",
    Icon: MessageSquare,
    accentColor: "#7c3aed",
    bgColor: "#faf5ff",
    countBg: "#ede9fe",
    countText: "#5b21b6",
    tagBg: "#ede9fe",
    tagText: "#6d28d9",
  },
  {
    id: "offer_sent",
    label: "Offer Sent",
    Icon: Send,
    accentColor: "#2563eb",
    bgColor: "#eff6ff",
    countBg: "#dbeafe",
    countText: "#1e40af",
    tagBg: "#dbeafe",
    tagText: "#1d4ed8",
  },
  {
    id: "accepted",
    label: "Hired",
    Icon: UserCheck,
    accentColor: "#16a34a",
    bgColor: "#f0fdf4",
    countBg: "#dcfce7",
    countText: "#14532d",
    tagBg: "#dcfce7",
    tagText: "#15803d",
  },
  {
    id: "rejected",
    label: "Rejected",
    Icon: UserX,
    accentColor: "#dc2626",
    bgColor: "#fef2f2",
    countBg: "#fee2e2",
    countText: "#991b1b",
    tagBg: "#fee2e2",
    tagText: "#b91c1c",
  },
];

const STAGE_ORDER = STAGES.map(s => s.id);

function getNextStage(current: ScreeningStatus): ScreeningStatus | null {
  const forward: ScreeningStatus[] = [
    "pending", "screening", "screened",
    "interview_scheduled", "interviewed", "offer_sent", "accepted",
  ];
  const idx = forward.indexOf(current);
  return idx !== -1 && idx < forward.length - 1 ? forward[idx + 1] : null;
}

export interface CandidatePipelineData {
  id: string;
  name: string;
  status: ScreeningStatus;
  score?: number;
  headline?: string;
  email?: string;
  source?: string;
}

interface PipelineViewProps {
  candidates: CandidatePipelineData[];
  onCandidateClick?: (id: string) => void;
  onStatusChange?: (id: string, status: ScreeningStatus) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string, checked: boolean) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  csv: "CSV",
  pdf: "PDF",
  json: "JSON",
  platform: "Manual",
};

function CandidateAvatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 select-none ring-2 ring-white shadow-sm"
      style={{
        background: `linear-gradient(135deg, hsl(${hue},55%,48%), hsl(${(hue + 45) % 360},65%,38%))`,
      }}
    >
      {initials}
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const { color, bg } =
    score >= 75
      ? { color: "#15803d", bg: "#dcfce7" }
      : score >= 50
      ? { color: "#b45309", bg: "#fef3c7" }
      : { color: "#b91c1c", bg: "#fee2e2" };
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 tabular-nums"
      style={{ color, backgroundColor: bg }}
    >
      {score}%
    </span>
  );
}

function CandidateCard({
  candidate,
  stage,
  onCandidateClick,
  onStatusChange,
  selectedIds,
  onToggleSelect,
}: {
  candidate: CandidatePipelineData;
  stage: StageConfig;
  onCandidateClick?: (id: string) => void;
  onStatusChange?: (id: string, status: ScreeningStatus) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string, checked: boolean) => void;
}) {
  const next = getNextStage(stage.id);
  const nextStage = next ? STAGES.find(s => s.id === next) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onClick={() => onCandidateClick?.(candidate.id)}
      className="relative group bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-150"
    >
      {onToggleSelect && (
        <div className="absolute -translate-y-2 -translate-x-0.5" onClick={e => e.stopPropagation()}>
          <CandidateCheckbox
            checked={!!selectedIds?.includes(candidate.id)}
            onChange={(v) => onToggleSelect?.(candidate.id, v)}
          />
        </div>
      )}
      {/* Avatar + name + score */}
      <div className="flex items-start gap-2.5">
        <CandidateAvatar name={candidate.name} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-gray-900 truncate leading-snug">
            {candidate.name}
          </p>
          <p className="text-[10px] text-gray-400 truncate mt-0.5 leading-snug">
            {candidate.headline || candidate.email || "—"}
          </p>
        </div>
        {candidate.score !== undefined && <ScorePill score={candidate.score} />}
      </div>

      {/* Source tag + advance button */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {candidate.source ? (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: stage.tagBg, color: stage.tagText }}
          >
            {SOURCE_LABELS[candidate.source] ?? candidate.source}
          </span>
        ) : (
          <span />
        )}

        {onStatusChange && nextStage && (
          <button
            onClick={e => {
              e.stopPropagation();
              onStatusChange(candidate.id, nextStage.id);
            }}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ backgroundColor: stage.countBg, color: stage.countText }}
            title={`Move to ${nextStage.label}`}
          >
            {nextStage.label}
            <ChevronRight className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function PipelineView({
  candidates,
  onCandidateClick,
  onStatusChange,
  selectedIds,
  onToggleSelect,
}: PipelineViewProps) {
  const stageMap = useMemo(() => {
    const map = new Map<ScreeningStatus, CandidatePipelineData[]>();
    for (const stage of STAGE_ORDER) map.set(stage, []);
    for (const c of candidates) {
      const key: ScreeningStatus = c.status ?? "pending";
      const bucket = map.get(key) ?? [];
      bucket.push(c);
      map.set(key, bucket);
    }
    return map;
  }, [candidates]);

  const total    = candidates.length;
  const hired    = stageMap.get("accepted")?.length ?? 0;
  const rejected = stageMap.get("rejected")?.length ?? 0;
  const active   = total - hired - rejected;
  const hireRate = total > 0 ? Math.round((hired / total) * 100) : 0;

  const kpis = [
    { label: "Total Applicants", value: total,         Icon: Users,         accent: "#0284c7", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "In Pipeline",      value: active,        Icon: TrendingUp,    accent: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
    { label: "Hired",            value: hired,         Icon: CheckCircle2,  accent: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Hire Rate",        value: `${hireRate}%`, Icon: Target,       accent: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  ];

  return (
    <div className="space-y-5">
      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm"
            style={{ borderColor: kpi.border }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: kpi.bg }}
            >
              <kpi.Icon className="w-4 h-4" style={{ color: kpi.accent }} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400 leading-none">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {STAGES.map((stage, si) => {
            const stageCandidates = stageMap.get(stage.id) ?? [];
            const pct = total > 0 ? Math.round((stageCandidates.length / total) * 100) : 0;
            const { Icon } = stage;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.05 }}
                className="flex-shrink-0 flex flex-col rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                style={{ width: 248, maxHeight: 680, backgroundColor: "#fafafa" }}
              >
                {/* Column header */}
                <div
                  className="px-3 pt-3 pb-2.5 border-b border-gray-200"
                  style={{ backgroundColor: stage.bgColor }}
                >
                  <div
                    className="h-0.5 rounded-full mb-2.5 opacity-60"
                    style={{ backgroundColor: stage.accentColor }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: stage.countBg }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: stage.accentColor }} />
                      </div>
                      <span
                        className="text-[11px] font-bold tracking-tight"
                        style={{ color: stage.accentColor }}
                      >
                        {stage.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-medium" style={{ color: stage.countText }}>
                        {pct}%
                      </span>
                      <span
                        className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums"
                        style={{ backgroundColor: stage.countBg, color: stage.countText }}
                      >
                        {stageCandidates.length}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: stage.accentColor }}
                    />
                  </div>
                </div>

                {/* Cards */}
                <div
                  className="flex-1 overflow-y-auto p-2 space-y-1.5"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <AnimatePresence>
                    {stageCandidates.length === 0 ? (
                      <div className="py-10 flex flex-col items-center gap-2">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center opacity-25"
                          style={{ backgroundColor: stage.countBg }}
                        >
                          <Icon className="w-4 h-4" style={{ color: stage.accentColor }} />
                        </div>
                        <p className="text-[11px] text-gray-300 font-medium">No candidates</p>
                      </div>
                    ) : (
                      stageCandidates.map(c => (
                        <CandidateCard
                          key={c.id}
                          candidate={c}
                          stage={stage}
                          onCandidateClick={onCandidateClick}
                          onStatusChange={onStatusChange}
                          selectedIds={selectedIds}
                          onToggleSelect={onToggleSelect}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Column footer */}
                {stageCandidates.length > 0 && (
                  <div
                    className="px-3 py-2 border-t border-gray-100 flex items-center gap-1.5"
                    style={{ backgroundColor: stage.bgColor }}
                  >
                    <Icon className="w-3 h-3" style={{ color: stage.accentColor }} />
                    <span className="text-[10px] font-medium" style={{ color: stage.countText }}>
                      {stageCandidates.length} candidate{stageCandidates.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
