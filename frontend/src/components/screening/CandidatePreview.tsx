'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  Target,
  Briefcase,
  GraduationCap,
  FolderOpen,
  Clock,
  Award,
  Star,
  CheckCircle2,
} from 'lucide-react';

interface CandidatePreviewProps {
  totalCandidates: number;
  weights: {
    skills: number;
    experience: number;
    education: number;
    projects: number;
    availability: number;
  };
  jobRequirements?: string[];
}

const CHARACTERISTICS = [
  {
    key: 'skills',
    label: 'Technical Skills',
    icon: Target,
    color: '#3b82f6',
    checks: ['Programming languages', 'Frameworks', 'Tools', 'Certifications'],
  },
  {
    key: 'experience',
    label: 'Work Experience',
    icon: Briefcase,
    color: '#8b5cf6',
    checks: ['Years of experience', 'Role similarity', 'Career growth', 'Company caliber'],
  },
  {
    key: 'education',
    label: 'Education',
    icon: GraduationCap,
    color: '#10b981',
    checks: ['Degree level', 'Field of study', 'University ranking', 'Courses'],
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: FolderOpen,
    color: '#f59e0b',
    checks: ['Project complexity', 'Personal work', 'Open source', 'Impact'],
  },
  {
    key: 'availability',
    label: 'Availability',
    icon: Clock,
    color: '#ec4899',
    checks: ['Notice period', 'Employment type', 'Location', 'Schedule'],
  },
];

export function CandidatePreview({ totalCandidates, weights, jobRequirements = [] }: CandidatePreviewProps) {
  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/30 border border-blue-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-500">Candidate Pool</p>
              <p className="text-xl font-bold text-gray-900">{totalCandidates}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100/30 border border-green-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-500">Evaluation Speed</p>
              <p className="text-xl font-bold text-gray-900">~10/s</p>
            </div>
          </div>
        </div>
      </div>

      {/* What We Evaluate */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <Award className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">Evaluation Criteria</h3>
            <p className="text-[10px] text-gray-500">How each candidate is scored</p>
          </div>
        </div>

        <div className="grid gap-2">
          {CHARACTERISTICS.map((char, index) => {
            const Icon = char.icon;
            const weight = weights[char.key as keyof typeof weights];

            return (
              <motion.div
                key={char.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all"
              >
                <div className="flex items-start gap-2.5">
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${char.color}15`,
                      border: `1.5px solid ${char.color}30`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: char.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900">{char.label}</span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          background: `${char.color}15`,
                          color: char.color,
                          border: `1px solid ${char.color}30`,
                        }}
                      >
                        {weight}% weight
                      </span>
                    </div>

                    {/* Checks */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {char.checks.map((check) => (
                        <span
                          key={check}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-white text-gray-600 border border-gray-200"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" style={{ color: char.color }} />
                          {check}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Key Requirements */}
      {jobRequirements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/30 border border-amber-200"
        >
          <div className="flex items-center gap-2 mb-2.5">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-gray-900">Key Requirements</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {jobRequirements.slice(0, 8).map((req, i) => (
              <span
                key={i}
                className="text-[10px] px-2.5 py-1 rounded-full bg-white text-gray-700 border border-amber-200 font-medium"
              >
                {req}
              </span>
            ))}
            {jobRequirements.length > 8 && (
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/80 text-gray-500">
                +{jobRequirements.length - 8} more
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Scoring Summary */}
      <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">Score Formula</p>
        <div className="space-y-1.5">
          {CHARACTERISTICS.map((char) => {
            const weight = weights[char.key as keyof typeof weights];
            return (
              <div key={char.key} className="flex items-center gap-2.5">
                <div className="w-16 text-[10px] text-gray-600">{char.label}</div>
                <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: char.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${weight}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <div className="w-8 text-[10px] font-mono text-gray-500 text-right">
                  ×{(weight / 100).toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-900">Final Score</span>
          <span className="text-[10px] font-mono text-green-600 font-medium">Σ(s × w) = 100%</span>
        </div>
      </div>
    </div>
  );
}