'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Briefcase, GraduationCap, FolderOpen, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Weights {
  skills: number;
  experience: number;
  education: number;
  projects: number;
  availability: number;
}

interface CriteriaSelectorProps {
  weights: Weights;
  onChange: (weights: Weights) => void;
  disabled?: boolean;
}

const CRITERIA = [
  {
    key: 'skills' as const,
    label: 'Skills Match',
    description: 'Technical proficiency vs job requirements',
    icon: Target,
    color: '#3b82f6',
  },
  {
    key: 'experience' as const,
    label: 'Experience',
    description: 'Work history depth & role relevance',
    icon: Briefcase,
    color: '#8b5cf6',
  },
  {
    key: 'education' as const,
    label: 'Education',
    description: 'Academic credentials & certifications',
    icon: GraduationCap,
    color: '#10b981',
  },
  {
    key: 'projects' as const,
    label: 'Projects',
    description: 'Portfolio quality & impact metrics',
    icon: FolderOpen,
    color: '#f59e0b',
  },
  {
    key: 'availability' as const,
    label: 'Availability',
    description: 'Start date & schedule fit',
    icon: Clock,
    color: '#ec4899',
  },
];

export function CriteriaSelector({ weights, onChange, disabled = false }: CriteriaSelectorProps) {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = totalWeight === 100;

  const adjustWeight = (key: keyof typeof weights, delta: number) => {
    if (disabled) return;

    const newWeights = { ...weights };
    const otherKeys = CRITERIA.filter(c => c.key !== key).map(c => c.key);

    const currentWeight = weights[key];
    const newWeight = Math.max(5, Math.min(50, currentWeight + delta));

    if (newWeight === currentWeight) return;

    const weightDiff = newWeight - currentWeight;
    const adjustmentPerOther = -weightDiff / (CRITERIA.length - 1);

    newWeights[key] = newWeight;
    otherKeys.forEach(k => {
      newWeights[k] = Math.max(5, Math.round(weights[k] + adjustmentPerOther));
    });

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
    <div className="space-y-3">
      {/* Criteria Cards */}
      <div className="grid gap-2.5">
        {CRITERIA.map((criteria, index) => {
          const Icon = criteria.icon;
          const weight = weights[criteria.key];

          return (
            <motion.div
              key={criteria.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${criteria.color}15`,
                    border: `1.5px solid ${criteria.color}30`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: criteria.color }} />
                </div>

                {/* Label & Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">{criteria.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{criteria.description}</p>
                </div>

                {/* Weight Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustWeight(criteria.key, -5)}
                    disabled={disabled || weight <= 5}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white border border-gray-200 hover:border-gray-300 text-sm"
                  >
                    −
                  </button>
                  <div
                    className="w-12 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: `${criteria.color}15`,
                      border: `1.5px solid ${criteria.color}40`,
                      color: criteria.color,
                    }}
                  >
                    {weight}%
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustWeight(criteria.key, 5)}
                    disabled={disabled || weight >= 50}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white border border-gray-200 hover:border-gray-300 text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-2.5 h-1 rounded-full bg-gray-200 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: criteria.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${weight}%` }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total Indicator */}
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg transition-all',
        isValid
          ? 'bg-green-50 border border-green-200'
          : 'bg-amber-50 border border-amber-200'
      )}>
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            isValid ? 'bg-green-100' : 'bg-amber-100'
          )}>
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <span className="text-amber-600 font-bold text-sm">!</span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">Total Weight</p>
            <p className="text-[10px] text-gray-500">
              {isValid ? 'Ready to screen' : 'Must equal 100%'}
            </p>
          </div>
        </div>
        <span className={cn(
          'text-lg font-bold',
          isValid ? 'text-green-600' : 'text-amber-600'
        )}>
          {totalWeight}%
        </span>
      </div>
    </div>
  );
}