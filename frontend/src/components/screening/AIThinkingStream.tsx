'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThoughtType =
  | 'analyzing'
  | 'scoring'
  | 'flagging'
  | 'generating'
  | 'evaluating'
  | 'thinking'
  | 'completed';

export interface Thought {
  id: string;
  type: ThoughtType;
  message: string;
  candidateName?: string;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed';
  detail?: string;
  thinkingContent?: string;
}

interface AIThinkingStreamProps {
  thoughts: Thought[];
  isRunning: boolean;
  currentCandidate?: string;
}

const STEP_CONFIG: Partial<Record<ThoughtType, { icon: React.ElementType; color: string; bg: string; border: string; label: string }>> = {
  analyzing:  { icon: Brain,         color: '#3b82f6', bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'Analyzing'  },
  evaluating: { icon: ArrowUpRight,  color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Evaluating' },
  scoring:    { icon: Sparkles,      color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Scoring'    },
  flagging:   { icon: AlertTriangle, color: '#f59e0b', bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'Checking'   },
  generating: { icon: FileText,      color: '#10b981', bg: 'bg-emerald-50',border: 'border-emerald-200',label: 'Generating' },
  completed:  { icon: CheckCircle2,  color: '#22c55e', bg: 'bg-green-50',  border: 'border-green-200',  label: 'Done'       },
};

// ─── Thinking Block ───────────────────────────────────────────────────────────
function ThinkingBlock({ thought, isLatest }: { thought: Thought; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const content = thought.thinkingContent ?? '';
  const PREVIEW_LEN = 480;
  const isLong = content.length > PREVIEW_LEN;
  const displayText = isLong && !showFull ? content.slice(0, PREVIEW_LEN) + '…' : content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Format thinking text: split into paragraphs, highlight candidate names
  const paragraphs = displayText.split(/\n{2,}/).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'rounded-xl overflow-hidden border transition-all duration-200',
        isLatest
          ? 'border-violet-500/40 shadow-lg shadow-violet-500/10'
          : 'border-slate-700/40'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-slate-900 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded-full',
            isLatest ? 'bg-violet-500/20' : 'bg-slate-700/60'
          )}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              isLatest ? 'bg-violet-400 animate-pulse' : 'bg-slate-500'
            )} />
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-wider',
              isLatest ? 'text-violet-300' : 'text-slate-400'
            )}>
              AI Reasoning
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{thought.message}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">{thought.timestamp}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1 rounded hover:bg-slate-700 transition-colors text-slate-500 hover:text-slate-300"
            title="Copy reasoning"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          }
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-slate-950 px-4 py-3.5 space-y-2.5">
              {paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="text-[11.5px] leading-relaxed text-slate-300 font-mono"
                >
                  {para.trim()}
                </p>
              ))}

              {isLong && (
                <button
                  onClick={() => setShowFull(!showFull)}
                  className="flex items-center gap-1 text-[10px] font-medium text-violet-400 hover:text-violet-300 transition-colors mt-1"
                >
                  {showFull ? (
                    <><ChevronUp className="w-3 h-3" />Show less</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" />Read full reasoning ({content.length.toLocaleString()} chars)</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({ thought, isLatest }: { thought: Thought; isLatest: boolean }) {
  const config = STEP_CONFIG[thought.type] ?? STEP_CONFIG.analyzing!;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
        isLatest
          ? `${config.bg} border ${config.border}`
          : 'bg-gray-50 border border-gray-100'
      )}
    >
      {/* Icon */}
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: `${config.color}18`, border: `1px solid ${config.color}30` }}
      >
        <Icon
          className={cn('w-3.5 h-3.5', isLatest && thought.status !== 'completed' && 'animate-pulse')}
          style={{ color: config.color }}
        />
      </div>

      {/* Label + message */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: `${config.color}15`, color: config.color }}
          >
            {config.label}
          </span>
          {isLatest && (
            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <p className="text-[11px] text-gray-700 leading-snug mt-0.5 truncate">{thought.message}</p>
      </div>

      <span className="text-[9px] text-gray-400 font-mono flex-shrink-0">{thought.timestamp}</span>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AIThinkingStream({ thoughts, isRunning }: AIThinkingStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const thinkingCount = thoughts.filter(t => t.type === 'thinking').length;
  const stepCount = thoughts.filter(t => t.type !== 'thinking').length;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [thoughts]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[520px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">AI Thinking</span>
                {isRunning && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30">
                    <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-[10px] font-medium text-violet-300">Live</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Real Gemini reasoning tokens</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            {thinkingCount > 0 && (
              <div className="text-right">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Reasoning</p>
                <div className="flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-violet-400" />
                  <p className="text-xs font-bold text-violet-300">{thinkingCount}</p>
                </div>
              </div>
            )}
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Steps</p>
              <p className="text-xs font-bold text-slate-300">{stepCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
      >
        <AnimatePresence mode="popLayout">
          {thoughts.map((thought, index) => {
            const isLatest = index === thoughts.length - 1;

            if (thought.type === 'thinking') {
              return (
                <ThinkingBlock key={thought.id} thought={thought} isLatest={isLatest} />
              );
            }

            return (
              <StepCard key={thought.id} thought={thought} isLatest={isLatest} />
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {thoughts.length === 0 && isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Brain className="w-7 h-7 text-violet-400 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Waiting for AI…</p>
            <p className="text-[11px] text-gray-400">Gemini is processing candidates</p>
          </div>
        )}

        {thoughts.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Brain className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No screening running</p>
            <p className="text-[11px] text-gray-400 mt-1">Start a screening to see AI reasoning</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {isRunning && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[10px] text-gray-500">Processing with Gemini 2.5 Flash Extended Thinking</span>
          </div>
        </div>
      )}
    </div>
  );
}
