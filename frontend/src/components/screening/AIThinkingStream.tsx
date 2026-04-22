'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThoughtType =
  | 'analyzing'
  | 'scoring'
  | 'flagging'
  | 'generating'
  | 'evaluating'
  | 'completed';

export interface Thought {
  id: string;
  type: ThoughtType;
  message: string;
  candidateName?: string;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed';
  detail?: string;
}

interface AIThinkingStreamProps {
  thoughts: Thought[];
  isRunning: boolean;
  currentCandidate?: string;
}

const THOUGHT_CONFIG = {
  analyzing: {
    icon: Brain,
    color: '#3b82f6',
    label: 'Analyzing',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  scoring: {
    icon: Sparkles,
    color: '#8b5cf6',
    label: 'Scoring',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  flagging: {
    icon: AlertTriangle,
    color: '#f59e0b',
    label: 'Checking',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  generating: {
    icon: FileText,
    color: '#10b981',
    label: 'Generating',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  evaluating: {
    icon: ArrowUp,
    color: '#6366f1',
    label: 'Evaluating',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  completed: {
    icon: CheckCircle2,
    color: '#22c55e',
    label: 'Done',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
};

export function AIThinkingStream({ thoughts, isRunning, currentCandidate }: AIThinkingStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayedThoughts, setDisplayedThoughts] = React.useState<Thought[]>([]);

  useEffect(() => {
    setDisplayedThoughts(thoughts.slice(-40));
  }, [thoughts]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedThoughts]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[480px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">AI Thinking</span>
                {isRunning && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100">
                    <span className="w-1 h-1 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-[10px] font-medium text-blue-700">Live</span>
                  </span>
                )}
              </div>
              {currentCandidate && (
                <p className="text-[10px] text-gray-500">
                  Evaluating <span className="font-medium text-gray-700">{currentCandidate}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Thoughts</p>
              <p className="text-xs font-bold text-gray-900">{thoughts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-2"
      >
        <AnimatePresence mode="popLayout">
          {displayedThoughts.map((thought, index) => {
            const config = THOUGHT_CONFIG[thought.type] || THOUGHT_CONFIG.analyzing;
            const Icon = config.icon;
            const isLatest = index === displayedThoughts.length - 1;

            return (
              <motion.div
                key={thought.id}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'rounded-lg p-3 transition-all duration-150',
                  isLatest
                    ? `${config.bg} border ${config.border} shadow-sm`
                    : 'bg-gray-50 border border-gray-100'
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
                      isLatest ? 'bg-white shadow-sm' : 'bg-white/80'
                    )}
                    style={{ border: `1px solid ${config.color}30` }}
                  >
                    {thought.status === 'completed' ? (
                      <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                    ) : (
                      <Icon className="w-3.5 h-3.5 animate-pulse" style={{ color: config.color }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: `${config.color}15`,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </span>
                      {isLatest && (
                        <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">{thought.message}</p>
                  </div>

                  {/* Timestamp */}
                  <span className="text-[9px] text-gray-400 font-mono flex-shrink-0">
                    {thought.timestamp}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {displayedThoughts.length === 0 && isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
            <p className="text-xs font-medium text-gray-700 mb-0.5">AI is analyzing candidates...</p>
            <p className="text-[10px] text-gray-400">Processing in real-time</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {isRunning && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] text-gray-500">Processing with Gemini 2.0 Flash</span>
          </div>
        </div>
      )}
    </div>
  );
}