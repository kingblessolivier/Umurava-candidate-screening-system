"use client";
import { motion } from "framer-motion";
import { ScreeningStatus, StatusDot } from "./StatusBadge";

interface PipelineStage {
  id: ScreeningStatus;
  label: string;
  icon: string;
  description: string;
}

const STAGES: PipelineStage[] = [
  { id: "pending", label: "Applied", icon: "📝", description: "Initial application" },
  { id: "screening", label: "Screening", icon: "🔍", description: "AI evaluation in progress" },
  { id: "screened", label: "Shortlisted", icon: "✅", description: "Passed AI screening" },
  { id: "interview_scheduled", label: "Interview", icon: "📅", description: "Interview scheduled" },
  { id: "interviewed", label: "Interviewed", icon: "💬", description: "Interview completed" },
  { id: "offer_sent", label: "Offer", icon: "💼", description: "Offer extended" },
  { id: "accepted", label: "Hired", icon: "🎉", description: "Offer accepted" },
];

interface CandidatePipelineData {
  id: string;
  name: string;
  status: ScreeningStatus;
  score?: number;
}

interface PipelineViewProps {
  candidates: CandidatePipelineData[];
  onCandidateClick?: (id: string) => void;
  onStatusChange?: (id: string, status: ScreeningStatus) => void;
}

export function PipelineView({
  candidates,
  onCandidateClick,
  onStatusChange,
}: PipelineViewProps) {
  return (
    <div className="space-y-6">
      {/* Pipeline Overview */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max pr-4">
          {STAGES.map((stage, index) => {
            const count = candidates.filter(c => c.status === stage.id).length;
            const isActive = count > 0;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex-shrink-0 w-40"
              >
                {/* Stage card */}
                <div
                  className="p-4 rounded-lg border-2 transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? "rgba(59, 130, 246, 0.05)" : "rgba(255, 255, 255, 0.02)",
                    borderColor: isActive ? "#3b82f6" : "var(--border)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{stage.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{stage.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {stage.description}
                      </p>
                    </div>
                  </div>

                  {/* Counter badge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      backgroundColor: isActive ? "#3b82f6" : "rgba(148, 163, 184, 0.2)",
                      color: isActive ? "white" : "var(--text-muted)",
                    }}
                  >
                    {count}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detailed view by stage */}
      <div className="space-y-6">
        {STAGES.map(stage => {
          const stageCandidates = candidates.filter(c => c.status === stage.id);

          if (stageCandidates.length === 0) return null;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg p-4"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <StatusDot status={stage.id} />
                <h3 className="font-semibold text-white">{stage.label}</h3>
                <span
                  className="ml-auto text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}
                >
                  {stageCandidates.length}
                </span>
              </div>

              {/* Candidates in this stage */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stageCandidates.map(candidate => (
                  <motion.div
                    key={candidate.id}
                    whileHover={{ y: -2 }}
                    onClick={() => onCandidateClick?.(candidate.id)}
                    className="p-3 rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{candidate.name}</p>
                        {candidate.score !== undefined && (
                          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            Score: <span className="font-semibold text-blue-400">{candidate.score}%</span>
                          </p>
                        )}
                      </div>
                      {/* Drag to next stage */}
                      {onStatusChange && stage.id !== "accepted" && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const nextStageIndex = STAGES.findIndex(s => s.id === stage.id) + 1;
                            if (nextStageIndex < STAGES.length) {
                              onStatusChange(candidate.id, STAGES[nextStageIndex].id);
                            }
                          }}
                          className="text-xs px-2 py-1 rounded text-blue-400 hover:bg-blue-500/20 transition-colors flex-shrink-0"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
