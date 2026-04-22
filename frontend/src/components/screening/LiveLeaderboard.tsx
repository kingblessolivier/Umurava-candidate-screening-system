'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Star, Crown } from 'lucide-react';
import { CandidateScore } from '@/types';

interface LiveLeaderboardProps {
  candidates: CandidateScore[];
  totalEvaluated: number;
  maxCandidates?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'Strongly Recommended': return '#22c55e';
    case 'Recommended': return '#3b82f6';
    case 'Consider': return '#f59e0b';
    default: return '#64748b';
  }
}

const RANK_COLORS = [
  'from-amber-400 to-amber-500',
  'from-gray-300 to-gray-400',
  'from-amber-600 to-amber-700',
];

export function LiveLeaderboard({
  candidates,
  totalEvaluated,
  maxCandidates = 5,
}: LiveLeaderboardProps) {
  const topCandidates = [...candidates]
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, maxCandidates);

  const [previousIds, setPreviousIds] = React.useState<Set<string>>(new Set());
  const [newIds, setNewIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const currentIds = new Set(topCandidates.map(c => c.candidateId));
    const newCand = new Set(
      topCandidates.filter(c => !previousIds.has(c.candidateId)).map(c => c.candidateId)
    );
    setNewIds(newCand);
    setPreviousIds(currentIds);
    const timer = setTimeout(() => setNewIds(new Set()), 2500);
    return () => clearTimeout(timer);
  }, [topCandidates]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Top Candidates</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {totalEvaluated > 0 ? `${topCandidates.length} leaders` : 'Awaiting results'}
              </p>
            </div>
          </div>
          {newIds.size > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 border border-green-200"
            >
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-[10px] font-medium text-green-700">Updated</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="p-3.5 space-y-2">
        <AnimatePresence mode="popLayout">
          {topCandidates.map((candidate, index) => {
            const isNew = newIds.has(candidate.candidateId);
            const scoreColor = getScoreColor(candidate.finalScore);
            const recColor = getRecommendationColor(candidate.recommendation);

            return (
              <motion.div
                key={candidate.candidateId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className={`
                  relative p-3 rounded-lg border transition-all
                  ${isNew ? 'bg-green-50 border-green-200 ring-1 ring-green-100' : ''}
                  ${index === 0 && !isNew ? 'bg-amber-50/50 border-amber-200' : ''}
                  ${!isNew && index !== 0 ? 'bg-gray-50 border-gray-100 hover:border-gray-200' : ''}
                `}
              >
                {/* New Badge */}
                {isNew && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-green-500 text-white text-[9px] font-bold shadow-lg"
                  >
                    NEW
                  </motion.div>
                )}

                <div className="flex items-center gap-2.5">
                  {/* Rank */}
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                    ${index < 3 ? `bg-gradient-to-br ${RANK_COLORS[index]} text-white shadow-lg` : 'bg-gray-100 text-gray-600'}
                  `}>
                    {index === 0 ? <Crown className="w-3.5 h-3.5" /> : `#${index + 1}`}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {candidate.candidateName}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: `${recColor}15`,
                          color: recColor,
                          border: `1px solid ${recColor}30`,
                        }}
                      >
                        {candidate.recommendation}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">
                      {candidate.summary}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <motion.span
                      key={candidate.finalScore}
                      initial={{ scale: 1.15 }}
                      animate={{ scale: 1 }}
                      className="text-lg font-bold block"
                      style={{ color: scoreColor }}
                    >
                      {candidate.finalScore}
                    </motion.span>
                    <span className="text-[9px] text-gray-400">/ 100</span>
                  </div>
                </div>

                {/* Sub-scores */}
                <div className="flex items-center gap-3.5 mt-2 pt-2 border-t border-gray-100/50">
                  <div className="flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 text-gray-400" />
                    <span className="text-[10px] text-gray-500">Conf:</span>
                    <span className={`text-[10px] font-semibold ${
                      candidate.confidenceScore >= 80 ? 'text-green-600' :
                      candidate.confidenceScore >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {candidate.confidenceScore}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Skills:</span>
                    <span className="text-[10px] font-semibold text-blue-600">{candidate.breakdown.skillsScore}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Exp:</span>
                    <span className="text-[10px] font-semibold text-purple-600">{candidate.breakdown.experienceScore}%</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {topCandidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-2.5">
              <Trophy className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs font-medium text-gray-600">No candidates yet</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Top candidates will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}