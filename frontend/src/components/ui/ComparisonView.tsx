"use client";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface CandidateComparison {
  id: string;
  name: string;
  skills: { name: string; level: string }[];
  experience: number;
  education: string;
  score: number;
  availability: string;
}

interface ComparisonViewProps {
  candidates: CandidateComparison[];
  onRemove?: (id: string) => void;
  onClose?: () => void;
}

export function ComparisonView({
  candidates,
  onRemove,
  onClose,
}: ComparisonViewProps) {
  if (candidates.length === 0) {
    return null;
  }

  const maxScore = Math.max(...candidates.map(c => c.score));
  const maxExperience = Math.max(...candidates.map(c => c.experience));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-lg p-6 space-y-6 overflow-x-auto"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Candidate Comparison
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Comparison table */}
      <div className="min-w-full overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                Metric
              </th>
              {candidates.map(candidate => (
                <th
                  key={candidate.id}
                  className="text-center text-xs font-semibold pb-3 px-4 min-w-40"
                  style={{ color: "var(--text-muted)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{candidate.name}</span>
                    {onRemove && (
                      <button
                        onClick={() => onRemove(candidate.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="space-y-px">
            {/* Overall Score */}
            <ComparisonRow
              label="Overall Score"
              candidates={candidates}
              getValue={c => `${c.score}%`}
              getBar={c => (c.score / maxScore) * 100}
              getColor={c => {
                if (c.score >= 80) return "#22c55e";
                if (c.score >= 60) return "#3b82f6";
                return "#f59e0b";
              }}
            />

            {/* Experience */}
            <ComparisonRow
              label="Experience"
              candidates={candidates}
              getValue={c => `${c.experience}y`}
              getBar={c => (c.experience / (maxExperience + 1)) * 100}
              getColor={() => "#8b5cf6"}
            />

            {/* Education */}
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="py-3 text-xs font-medium text-gray-400">
                Education
              </td>
              {candidates.map(candidate => (
                <td key={candidate.id} className="py-3 px-4 text-center">
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                      color: "#3b82f6",
                    }}
                  >
                    {candidate.education}
                  </span>
                </td>
              ))}
            </tr>

            {/* Availability */}
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="py-3 text-xs font-medium text-gray-400">
                Availability
              </td>
              {candidates.map(candidate => (
                <td key={candidate.id} className="py-3 px-4 text-center">
                  <span className="text-xs text-gray-300">
                    {candidate.availability}
                  </span>
                </td>
              ))}
            </tr>

            {/* Top Skills */}
            <tr>
              <td className="py-3 text-xs font-medium text-gray-400">
                Top Skills
              </td>
              {candidates.map(candidate => (
                <td key={candidate.id} className="py-3 px-4">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {candidate.skills.slice(0, 3).map((skill, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: "rgba(139, 92, 246, 0.1)",
                          color: "#c4b5fd",
                        }}
                      >
                        {skill.name}
                      </span>
                    ))}
                    {candidate.skills.length > 3 && (
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: "rgba(148, 163, 184, 0.1)",
                          color: "var(--text-muted)",
                        }}
                      >
                        +{candidate.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs text-gray-400 text-center">
          💡 Tip: Click on any candidate to view full profile and details
        </p>
      </div>
    </motion.div>
  );
}

function ComparisonRow({
  label,
  candidates,
  getValue,
  getBar,
  getColor,
}: {
  label: string;
  candidates: CandidateComparison[];
  getValue: (c: CandidateComparison) => string;
  getBar: (c: CandidateComparison) => number;
  getColor: (c: CandidateComparison) => string;
}) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td className="py-3 text-xs font-medium text-gray-400">{label}</td>
      {candidates.map(candidate => (
        <td key={candidate.id} className="py-3 px-4">
          <div className="space-y-1">
            <p className="text-center text-sm font-semibold text-white">
              {getValue(candidate)}
            </p>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${getBar(candidate)}%` }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="h-full"
                style={{ backgroundColor: getColor(candidate) }}
              />
            </div>
          </div>
        </td>
      ))}
    </tr>
  );
}
