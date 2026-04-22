'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  FileText,
  Trophy,
  CheckCircle2,
  Target,
  Briefcase,
  GraduationCap,
  FolderOpen,
  Clock,
  Zap,
  Search,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThoughtType =
  | 'analyzing'
  | 'scoring'
  | 'flagging'
  | 'generating'
  | 'evaluating'
  | 'completed'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'availability';

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

const THOUGHT_ICONS: Record<ThoughtType, React.ElementType> = {
  analyzing: Brain,
  scoring: Sparkles,
  flagging: AlertTriangle,
  generating: FileText,
  evaluating: Target,
  completed: Trophy,
  skills: Target,
  experience: Briefcase,
  education: GraduationCap,
  projects: FolderOpen,
  availability: Clock,
};

const THOUGHT_COLORS: Record<ThoughtType, string> = {
  analyzing: '#60a5fa',
  scoring: '#a78bfa',
  flagging: '#f59e0b',
  generating: '#34d399',
  evaluating: '#6b7280',
  completed: '#22c55e',
  skills: '#60a5fa',
  experience: '#a78bfa',
  education: '#34d399',
  projects: '#f59e0b',
  availability: '#ec4899',
};

const THOUGHT_LABELS: Record<ThoughtType, string> = {
  analyzing: 'Analyzing',
  scoring: 'Scoring',
  flagging: 'Risk Check',
  generating: 'Generating',
  evaluating: 'Evaluating',
  completed: 'Complete',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  availability: 'Availability',
};

export function AIThinkingStream({ thoughts, isRunning, currentCandidate }: AIThinkingStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayedThoughts, setDisplayedThoughts] = React.useState<Thought[]>([]);

  // Auto-scroll to latest thought
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  // Keep last 30 thoughts for performance
  useEffect(() => {
    setDisplayedThoughts(thoughts.slice(-30));
  }, [thoughts]);

  const groupedThoughts = displayedThoughts.reduce((acc, thought) => {
    const key = thought.candidateName || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(thought);
    return acc;
  }, {} as Record<string, Thought[]>);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-surface/80 backdrop-blur-xl shadow-2xl">
      {/* Header with AI Status */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-transparent" />
        <div className="relative flex items-center gap-3 px-4 py-3 border-b border-white/10">
          {/* Animated AI Brain */}
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Brain className="w-5 h-5 text-white" />
            </div>
            {isRunning && (
              <>
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary-500/30 to-purple-600/30 blur-sm animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-900 animate-ping" />
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                AI Thinking Engine
              </span>
              {isRunning && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-green-400">Live</span>
                </span>
              )}
            </div>
            {currentCandidate && (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                Evaluating: <span className="text-white font-medium">{currentCandidate}</span>
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right">
              <p className="text-[10px] text-gray-500">Thoughts</p>
              <p className="text-sm font-bold text-white">{thoughts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Thinking Stream */}
      <div
        ref={scrollRef}
        className="h-80 overflow-y-auto p-4 space-y-2.5 scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent',
        }}
      >
        <AnimatePresence>
          {displayedThoughts.length === 0 && isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-12"
            >
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-purple-600/20 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-primary-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 blur-xl opacity-20 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-white mb-1">AI is warming up...</p>
              <p className="text-xs text-gray-500">Preparing to analyze candidates</p>
            </motion.div>
          )}

          {displayedThoughts.map((thought, index) => {
            const Icon = THOUGHT_ICONS[thought.type];
            const color = THOUGHT_COLORS[thought.type];
            const label = THOUGHT_LABELS[thought.type];
            const isLatest = index === displayedThoughts.length - 1;
            const isCandidateStart = !thought.candidateName ||
              (index > 0 && displayedThoughts[index - 1]?.candidateName !== thought.candidateName);

            return (
              <motion.div
                key={thought.id}
                initial={{ opacity: 0, x: -16, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.98 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={cn(
                  'relative rounded-xl p-3 transition-all duration-300',
                  isLatest
                    ? 'bg-gradient-to-r from-primary-500/15 to-purple-500/15 border border-primary-500/30 shadow-lg shadow-primary-500/10'
                    : 'bg-white/5 border border-white/5 hover:border-white/10'
                )}
              >
                {/* Connection line for same candidate */}
                {thought.candidateName && index > 0 && displayedThoughts[index - 1]?.candidateName === thought.candidateName && (
                  <div className="absolute -top-3 left-5 w-0.5 h-3 bg-gradient-to-b from-transparent to-white/10" />
                )}

                <div className="flex items-start gap-3">
                  {/* Timestamp */}
                  <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 mt-0.5">
                    {thought.timestamp}
                  </span>

                  {/* Icon with pulse effect for latest */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      {thought.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color }} />
                      ) : (
                        <Icon className="w-4 h-4" style={{ color }} />
                      )}
                    </div>
                    {isLatest && isRunning && (
                      <div className="absolute -inset-1 rounded-lg" style={{ background: `radial-gradient(circle, ${color}30 0%, transparent 70%)` }}>
                        <div className="absolute inset-0 rounded-lg border animate-ping" style={{ borderColor: color }} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Candidate name header */}
                    {thought.candidateName && isCandidateStart && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                        <span className="text-[10px] font-semibold text-white bg-white/10 px-2 py-0.5 rounded-full">
                          {thought.candidateName}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-l from-white/20 to-transparent" />
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: `${color}20`,
                          color: color,
                          border: `1px solid ${color}30`,
                        }}
                      >
                        {label}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-xs text-gray-200 leading-relaxed">
                      {thought.message}
                    </p>

                    {/* Detail */}
                    {thought.detail && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] text-gray-500 mt-1.5 pl-2 border-l-2 border-white/10"
                      >
                        {thought.detail}
                      </motion.p>
                    )}
                  </div>

                  {/* Status indicator */}
                  {thought.status === 'completed' && (
                    <span className="text-[10px] text-green-400 flex-shrink-0 font-semibold">
                      ✓
                    </span>
                  )}
                  {thought.status === 'processing' && isLatest && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }}>
                        <div className="w-full h-full rounded-full animate-ping" style={{ background: `${color}60` }} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer with processing status */}
      {isRunning && (
        <div className="px-4 py-2.5 border-t border-white/10 bg-gradient-to-r from-primary-500/5 to-transparent">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] text-gray-400">
              Processing in real-time with Gemini 2.0 Flash
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
