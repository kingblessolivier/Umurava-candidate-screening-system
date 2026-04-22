'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Briefcase, GraduationCap, FolderOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CriteriaSelectorProps {
  weights: {
    skills: number;
    experience: number;
    education: number;
    projects: number;
    availability: number;
  };
  onChange: (weights: typeof weights) => void;
  disabled?: boolean;
}

const CRITERIA = [
  {
    key: 'skills' as const,
    label: 'Skills Match',
    description: 'Technical skills vs job requirements',
    icon: Target,
    color: '#60a5fa',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    key: 'experience' as const,
    label: 'Experience',
    description: 'Work history depth & relevance',
    icon: Briefcase,
    color: '#a78bfa',
    gradient: 'from-violet-400 to-violet-600',
  },
  {
    key: 'education' as const,
    label: 'Education',
    description: 'Degrees & certifications',
    icon: GraduationCap,
    color: '#34d399',
    gradient: 'from-emerald-400 to-emerald-600',
  },
  {
    key: 'projects' as const,
    label: 'Projects',
    description: 'Portfolio strength & impact',
    icon: FolderOpen,
    color: '#f59e0b',
    gradient: 'from-amber-400 to-amber-600',
  },
  {
    key: 'availability' as const,
    label: 'Availability',
    description: 'Start date compatibility',
    icon: Clock,
    color: '#ec4899',
    gradient: 'from-pink-400 to-pink-600',
  },
];

export function CriteriaSelector({ weights, onChange, disabled = false }: CriteriaSelectorProps) {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = totalWeight === 100;

  const adjustWeight = (key: keyof typeof weights, delta: number) => {
    if (disabled) return;

    const newWeights = { ...weights };
    const otherKeys = CRITERIA.filter(c => c.key !== key).map(c => c.key);

    // Find available weight to redistribute
    const currentWeight = weights[key];
    const newWeight = Math.max(5, Math.min(50, currentWeight + delta));

    if (newWeight === currentWeight) return;

    const weightDiff = newWeight - currentWeight;
    const adjustmentPerOther = -weightDiff / (CRITERIA.length - 1);

    newWeights[key] = newWeight;
    otherKeys.forEach(k => {
      newWeights[k] = Math.round(weights[k] + adjustmentPerOther);
    });

    // Ensure total is exactly 100
    const newTotal = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (newTotal !== 100) {
      const diff = 100 - newTotal;
      const largestWeightKey = Object.entries(newWeights).reduce((a, b) =>
        b[1] > a[1] ? b : a
      )[0] as keyof typeof weights;
      newWeights[largestWeightKey] += diff;
    }

    onChange(newWeights);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Evaluation Criteria</h3>
          <p className="text-xs text-gray-400 mt-0.5">Adjust weights to prioritize what matters most</p>
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
          isValid
            ? "bg-green-500/10 text-green-400 border border-green-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        )}>
          Total: {totalWeight}%
        </div>
      </div>

      {/* Criteria Sliders */}
      <div className="space-y-3">
        {CRITERIA.map((criteria, index) => {
          const Icon = criteria.icon;
          const weight = weights[criteria.key];

          return (
            <motion.div
              key={criteria.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className="flex items-center gap-3 mb-1.5">
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${criteria.color}20, ${criteria.color}10)`,
                    border: `1px solid ${criteria.color}30`
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: criteria.color }} />
                </div>

                {/* Label & Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{criteria.label}</p>
                  <p className="text-[10px] text-gray-500">{criteria.description}</p>
                </div>

                {/* Weight Value */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustWeight(criteria.key, -5)}
                    disabled={disabled || weight <= 5}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-gray-400"
                  >
                    −
                  </button>
                  <div
                    className="w-10 h-6 rounded-md flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: `${criteria.color}20`, border: `1px solid ${criteria.color}30` }}
                  >
                    {weight}%
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustWeight(criteria.key, 5)}
                    disabled={disabled || weight >= 50}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-gray-400"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${criteria.gradient}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${weight}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Validation Warning */}
      {!isValid && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <div className="w-1 h-4 rounded-full bg-red-500" />
          <p className="text-xs text-red-400">
            Weights must sum to 100%. Current total: {totalWeight}%
          </p>
        </motion.div>
      )}
    </div>
  );
}
