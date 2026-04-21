'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Briefcase, GraduationCap, FolderOpen, Clock } from 'lucide-react';

interface CategoryScore {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

interface LiveScoreGaugesProps {
  scores: {
    skills: number;
    experience: number;
    education: number;
    projects: number;
    availability: number;
  };
  evaluatedCount: number;
}

const CATEGORIES: CategoryScore[] = [
  { label: 'Skills', value: 0, icon: Brain, color: '#60a5fa' },
  { label: 'Experience', value: 0, icon: Briefcase, color: '#a78bfa' },
  { label: 'Education', value: 0, icon: GraduationCap, color: '#34d399' },
  { label: 'Projects', value: 0, icon: FolderOpen, color: '#f59e0b' },
  { label: 'Availability', value: 0, icon: Clock, color: '#ec4899' },
];

export function LiveScoreGauges({ scores, evaluatedCount }: LiveScoreGaugesProps) {
  const categoryScores = [
    { ...CATEGORIES[0], value: scores.skills },
    { ...CATEGORIES[1], value: scores.experience },
    { ...CATEGORIES[2], value: scores.education },
    { ...CATEGORIES[3], value: scores.projects },
    { ...CATEGORIES[4], value: scores.availability },
  ];

  return (
    <div className="rounded-2xl p-5 border border-white/10 bg-surface/50 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Live Category Scores</h3>
          <p className="text-xs text-gray-500">
            Running average across {evaluatedCount} evaluated candidates
          </p>
        </div>
        {evaluatedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] text-green-400">Updating</span>
          </div>
        )}
      </div>

      {/* Score Gauges Grid */}
      <div className="grid grid-cols-5 gap-3">
        {categoryScores.map((cat, index) => (
          <motion.div
            key={cat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="flex flex-col items-center"
          >
            {/* Circular Gauge */}
            <div className="relative w-14 h-14 mb-2">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke={cat.color}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 24}
                  initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 24 * (1 - cat.value / 100),
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                  strokeLinecap="round"
                />
              </svg>
              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
              </div>
            </div>

            {/* Label & Value */}
            <span className="text-[10px] text-gray-400 text-center">{cat.label}</span>
            <span
              className="text-sm font-bold"
              style={{ color: cat.value >= 80 ? '#22c55e' : cat.value >= 65 ? '#60a5fa' : cat.value >= 50 ? '#f59e0b' : '#ef4444' }}
            >
              {cat.value}%
            </span>
          </motion.div>
        ))}
      </div>

      {/* Pool info */}
      {evaluatedCount === 0 && (
        <p className="text-xs text-gray-500 text-center mt-4">
          Scores will appear as candidates are evaluated
        </p>
      )}
    </div>
  );
}
