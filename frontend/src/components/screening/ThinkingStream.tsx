'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Brain, Sparkles, AlertTriangle, FileText, Trophy } from 'lucide-react';
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

interface ThinkingStreamProps {
  thoughts: Thought[];
  isRunning: boolean;
}

const THOUGHT_ICONS: Record<ThoughtType, React.ElementType> = {
  analyzing: Brain,
  scoring: Sparkles,
  flagging: AlertTriangle,
  generating: FileText,
  evaluating: Circle,
  completed: Trophy,
};

const THOUGHT_COLORS: Record<ThoughtType, string> = {
  analyzing: '#60a5fa',
  scoring: '#a78bfa',
  flagging: '#f59e0b',
  generating: '#34d399',
  evaluating: '#6b7280',
  completed: '#22c55e',
};

export function ThinkingStream({ thoughts, isRunning }: ThinkingStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest thought
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-surface/50 backdrop-blur">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-primary-500/10 to-transparent">
        <Brain className="w-4 h-4 text-primary-400" />
        <span className="text-xs font-semibold text-primary-300 uppercase tracking-wider">
          Live Thinking Stream
        </span>
        {isRunning && (
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            <span className="text-[10px] text-primary-400">Live</span>
          </div>
        )}
      </div>

      {/* Thought Log */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto p-4 space-y-2 scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent',
        }}
      >
        <AnimatePresence>
          {thoughts.map((thought, index) => {
            const Icon = THOUGHT_ICONS[thought.type];
            const color = THOUGHT_COLORS[thought.type];
            const isLatest = index === thoughts.length - 1;

            return (
              <motion.div
                key={thought.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg transition-all',
                  isLatest ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-white/5'
                )}
              >
                {/* Timestamp */}
                <span className="text-[10px] font-mono text-gray-500 flex-shrink-0 mt-0.5">
                  {thought.timestamp}
                </span>

                {/* Icon */}
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${color}15` }}
                >
                  {thought.status === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3" style={{ color }} />
                  ) : (
                    <Icon className="w-3 h-3" style={{ color }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {thought.candidateName && (
                    <span className="text-[10px] font-medium text-primary-400 block mb-0.5">
                      {thought.candidateName}
                    </span>
                  )}
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {thought.message}
                  </p>
                </div>

                {/* Status indicator */}
                {thought.status === 'completed' && (
                  <span className="text-[10px] text-green-400 flex-shrink-0">✓</span>
                )}
                {thought.status === 'processing' && isLatest && (
                  <span className="relative flex h-2 w-2 flex-shrink-0 mt-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {thoughts.length === 0 && isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain className="w-8 h-8 text-gray-600 mb-2 animate-pulse" />
            <p className="text-sm text-gray-500">AI is preparing to analyze candidates...</p>
          </div>
        )}
      </div>
    </div>
  );
}
