'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CandidateScore } from '@/types';

interface LiveLeaderboardProps {
  candidates: CandidateScore[];
  totalEvaluated: number;
  maxCandidates?: number;
}

function getRankIcon(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#60a5fa';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'Strongly Recommended': return '#22c55e';
    case 'Recommended': return '#60a5fa';
    case 'Consider': return '#f59e0b';
    default: return '#64748b';
  }
}

export function LiveLeaderboard({
  candidates,
  totalEvaluated,
  maxCandidates = 3,
}: LiveLeaderboardProps) {
  const topCandidates = [...candidates]
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, maxCandidates);

  // Track if a candidate is new (wasn't in previous top)
  const [previousTopIds, setPreviousTopIds] = React.useState<Set<string>>(new Set());
  const [newIds, setNewIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const currentIds = new Set(topCandidates.map(c => c.candidateId));
    const newCandidateIds = new Set(
      topCandidates.filter(c => !previousTopIds.has(c.candidateId)).map(c => c.candidateId)
    );
    setNewIds(newCandidateIds);
    setPreviousTopIds(currentIds);

    // Clear new indicator after animation
    const timer = setTimeout(() => setNewIds(new Set()), 2000);
    return () => clearTimeout(timer);
  }, [topCandidates]);

  return (
    <div className="rounded-2xl p-5 border border-white/10 bg-gradient-to-br from-primary-500/10 via-surface/50 to-transparent backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Top Candidates</h3>
            <p className="text-xs text-gray-500">
              {totalEvaluated > 0
                ? `Found ${topCandidates.length} leaders from ${totalEvaluated} evaluated`
                : 'Waiting for evaluations...'}
            </p>
          </div>
        </div>
        {newIds.size > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-green-400">
            <TrendingUp className="w-3 h-3" />
            New leader!
          </span>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        <AnimatePresence>
          {topCandidates.map((candidate, index) => {
            const isNew = newIds.has(candidate.candidateId);
            const rankIcon = getRankIcon(index + 1);
            const scoreColor = getScoreColor(candidate.finalScore);
            const recColor = getRecommendationColor(candidate.recommendation);

            return (
              <motion.div
                key={candidate.candidateId}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                className={`relative p-3 rounded-xl border transition-all ${
                  isNew
                    ? 'bg-green-500/10 border-green-500/30 ring-2 ring-green-500/20'
                    : index === 0
                    ? 'bg-yellow-500/5 border-yellow-500/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {isNew && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <TrendingUp className="w-2.5 h-2.5 text-white" />
                  </motion.div>
                )}

                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      index === 0
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : index === 1
                        ? 'bg-gray-500/20 text-gray-400'
                        : index === 2
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-white/10 text-gray-500'
                    }`}
                  >
                    {rankIcon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">
                        {candidate.candidateName}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${recColor}18`,
                          color: recColor,
                          border: `1px solid ${recColor}30`,
                        }}
                      >
                        {candidate.recommendation}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">
                      {candidate.summary}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <motion.span
                      key={candidate.finalScore}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-lg font-bold block"
                      style={{ color: scoreColor }}
                    >
                      {candidate.finalScore}
                    </motion.span>
                    <span className="text-[10px] text-gray-600">/ 100</span>
                  </div>
                </div>

                {/* Confidence & breakdown preview */}
                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Confidence:</span>
                    <span
                      className={`text-[10px] font-medium ${
                        candidate.confidenceScore >= 80
                          ? 'text-green-400'
                          : candidate.confidenceScore >= 60
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {candidate.confidenceScore}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Skills:</span>
                    <span className="text-[10px] font-medium text-blue-400">
                      {candidate.breakdown.skillsScore}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Exp:</span>
                    <span className="text-[10px] font-medium text-purple-400">
                      {candidate.breakdown.experienceScore}%
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {topCandidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Trophy className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">Top candidates will appear here as they're discovered</p>
          </div>
        )}
      </div>
    </div>
  );
}
