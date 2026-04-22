'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Target,
  Briefcase,
  GraduationCap,
  FolderOpen,
  Clock,
  TrendingUp,
  Award,
  Star,
  CheckCircle,
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
    color: '#60a5fa',
    description: 'Matching required technologies and proficiency levels',
    checks: ['Programming languages', 'Frameworks & libraries', 'Tools & platforms', 'Certifications'],
  },
  {
    key: 'experience',
    label: 'Work Experience',
    icon: Briefcase,
    color: '#a78bfa',
    description: 'Career progression and role relevance',
    checks: ['Years of experience', 'Role similarity', 'Career growth', 'Company caliber'],
  },
  {
    key: 'education',
    label: 'Education',
    icon: GraduationCap,
    color: '#34d399',
    description: 'Academic background and continuous learning',
    checks: ['Degree level', 'Field of study', 'University ranking', 'Recent courses'],
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: FolderOpen,
    color: '#f59e0b',
    description: 'Portfolio quality and real-world impact',
    checks: ['Project complexity', 'Personal initiatives', 'Open source', 'Impact metrics'],
  },
  {
    key: 'availability',
    label: 'Availability',
    icon: Clock,
    color: '#ec4899',
    description: 'Start date and employment type match',
    checks: ['Notice period', 'Employment type', 'Location preference', 'Schedule flexibility'],
  },
];

export function CandidatePreview({ totalCandidates, weights, jobRequirements = [] }: CandidatePreviewProps) {
  return (
    <div className="space-y-6">
      {/* Pool Stats */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-gray-400">Candidate Pool</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalCandidates}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">profiles to evaluate</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-gray-400">Evaluation Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">~10/s</p>
          <p className="text-[10px] text-gray-500 mt-0.5">candidates per second</p>
        </motion.div>
      </div>

      {/* What We Evaluate */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-400" />
          Evaluation Characteristics
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Each candidate is scored across 5 key dimensions based on job requirements
        </p>

        <div className="space-y-3">
          {CHARACTERISTICS.map((char, index) => {
            const Icon = char.icon;
            const weight = weights[char.key as keyof typeof weights];

            return (
              <motion.div
                key={char.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="group p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${char.color}25, ${char.color}10)`,
                      border: `1px solid ${char.color}30`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: char.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">{char.label}</span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: `${char.color}20`,
                          color: char.color,
                        }}
                      >
                        {weight}% weight
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">{char.description}</p>

                    {/* Check items */}
                    <div className="flex flex-wrap gap-1.5">
                      {char.checks.slice(0, 3).map((check) => (
                        <span
                          key={check}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/5 text-gray-400"
                        >
                          <CheckCircle className="w-2.5 h-2.5" style={{ color: char.color }} />
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

      {/* Job Requirements Preview */}
      {jobRequirements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border border-primary-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-white">Key Requirements</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {jobRequirements.slice(0, 8).map((req, i) => (
              <span
                key={i}
                className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-gray-300 border border-white/10"
              >
                {req}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Scoring Formula Preview */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Scoring Formula
        </p>
        <div className="space-y-2">
          {CHARACTERISTICS.map((char) => {
            const weight = weights[char.key as keyof typeof weights];
            return (
              <div key={char.key} className="flex items-center gap-2">
                <div className="w-20 text-[10px] text-gray-500">{char.label}</div>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${weight}%`,
                      background: `linear-gradient(90deg, ${char.color}, ${char.color}80)`,
                    }}
                  />
                </div>
                <div className="w-10 text-right text-[10px] font-mono text-white">
                  ×{(weight / 100).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Final Score</span>
          <span className="text-xs font-mono text-green-400">
            Σ (score × weight) = 100%
          </span>
        </div>
      </div>
    </div>
  );
}
