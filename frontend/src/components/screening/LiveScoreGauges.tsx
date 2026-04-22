'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Briefcase, GraduationCap, FolderOpen, Clock, TrendingUp } from 'lucide-react';

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
  { label: 'Skills', value: 0, icon: Brain, color: '#3b82f6' },
  { label: 'Experience', value: 0, icon: Briefcase, color: '#8b5cf6' },
  { label: 'Education', value: 0, icon: GraduationCap, color: '#10b981' },
  { label: 'Projects', value: 0, icon: FolderOpen, color: '#f59e0b' },
  { label: 'Availability', value: 0, icon: Clock, color: '#ec4899' },
];

function getScoreColor(value: number): string {
  if (value >= 80) return '#22c55e';
  if (value >= 65) return '#3b82f6';
  if (value >= 50) return '#f59e0b';
  return '#ef4444';
}

export function LiveScoreGauges({ scores, evaluatedCount }: LiveScoreGaugesProps) {
  const categoryScores = [
    { ...CATEGORIES[0], value: scores.skills },
    { ...CATEGORIES[1], value: scores.experience },
    { ...CATEGORIES[2], value: scores.education },
    { ...CATEGORIES[3], value: scores.projects },
    { ...CATEGORIES[4], value: scores.availability },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-gray-900">Live Scores</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Avg. across {evaluatedCount} candidates
          </p>
        </div>
        {evaluatedCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
            <TrendingUp className="w-3 h-3 text-green-600" />
            <span className="text-[10px] font-medium text-green-700">Live</span>
          </div>
        )}
      </div>

      {/* Circular Gauges */}
      <div className="flex justify-between items-center">
        {categoryScores.map((cat, index) => (
          <motion.div
            key={cat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            className="flex flex-col items-center"
          >
            {/* Gauge */}
            <div className="relative w-14 h-14 mb-1.5">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background */}
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="#f3f4f6"
                  strokeWidth="5"
                  fill="none"
                />
                {/* Progress */}
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke={cat.color}
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 24 * (1 - cat.value / 100),
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.06 }}
                />
              </svg>
              {/* Icon Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
              </div>
            </div>

            {/* Label */}
            <span className="text-[10px] text-gray-500 font-medium">{cat.label}</span>

            {/* Value */}
            <span
              className="text-sm font-bold"
              style={{ color: getScoreColor(cat.value) }}
            >
              {Math.round(cat.value)}%
            </span>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {evaluatedCount === 0 && (
        <p className="text-[10px] text-gray-400 text-center mt-3 pt-3 border-t border-gray-100">
          Scores will appear as candidates are evaluated
        </p>
      )}
    </div>
  );
}