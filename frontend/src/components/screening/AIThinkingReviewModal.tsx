'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Brain,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Users,
  Zap,
  Search,
  FileText,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { ThinkingSnapshot } from '@/types';
import { cn } from '@/lib/utils';

interface AIThinkingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  thinkingLog: ThinkingSnapshot[];
  jobTitle: string;
  screeningDate: string;
  totalApplicants: number;
}

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  evaluating: { label: 'Evaluation',  color: '#6366f1', bg: 'bg-indigo-500/20' },
  reranking:  { label: 'Re-ranking',  color: '#8b5cf6', bg: 'bg-violet-500/20' },
  rejection:  { label: 'Rejection',   color: '#f59e0b', bg: 'bg-amber-500/20'  },
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Highlight occurrences of a search term inside text
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-400/40 text-yellow-200 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function ThinkingPanel({
  snapshot,
  searchQuery,
}: {
  snapshot: ThinkingSnapshot;
  searchQuery: string;
}) {
  const [copied, setCopied] = useState(false);
  const stageConf = STAGE_CONFIG[snapshot.stage] ?? STAGE_CONFIG.evaluating;
  const paragraphs = snapshot.thinking.split(/\n{2,}/).filter(Boolean);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snapshot.thinking);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div
      key={snapshot.timestamp}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="h-full flex flex-col"
    >
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-slate-700/60 bg-slate-800/40 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full', stageConf.bg)}
                style={{ color: stageConf.color }}
              >
                {stageConf.label}
              </span>
              <span className="text-xs font-semibold text-white">{snapshot.batchLabel}</span>
            </div>

            {/* Candidate names */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {snapshot.candidateNames.slice(0, 8).map((name) => (
                  <span
                    key={name}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono"
                  >
                    {name}
                  </span>
                ))}
                {snapshot.candidateNames.length > 8 && (
                  <span className="text-[10px] text-slate-500 self-center">
                    +{snapshot.candidateNames.length - 8} more
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span>{formatTime(snapshot.timestamp)}</span>
              <span>·</span>
              <span>{snapshot.thinking.length.toLocaleString()} chars</span>
              <span>·</span>
              <span>{paragraphs.length} paragraphs</span>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-slate-400 hover:text-slate-200 transition-colors text-[11px] font-medium flex-shrink-0"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied</span></>
            ) : (
              <><Copy className="w-3 h-3" /><span>Copy</span></>
            )}
          </button>
        </div>
      </div>

      {/* Thinking content */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
      >
        {paragraphs.map((para, i) => (
          <p
            key={i}
            className="text-[12px] leading-relaxed text-slate-300 font-mono"
          >
            <HighlightedText text={para.trim()} query={searchQuery} />
          </p>
        ))}
      </div>
    </motion.div>
  );
}

export function AIThinkingReviewModal({
  isOpen,
  onClose,
  thinkingLog,
  jobTitle,
  screeningDate,
  totalApplicants,
}: AIThinkingReviewModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setActiveIndex(0);
  }, [isOpen]);

  // Scroll active sidebar item into view
  useEffect(() => {
    const el = sidebarRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  if (!isOpen) return null;

  const snapshot = thinkingLog[activeIndex];
  const totalChars = thinkingLog.reduce((a, s) => a + s.thinking.length, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-4 md:inset-8 lg:inset-12 z-50 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/80 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">AI Reasoning Journal</h2>
                  <p className="text-[11px] text-slate-400">
                    {jobTitle} · {formatDate(screeningDate)} · {totalApplicants} applicants
                  </p>
                </div>
              </div>

              {/* Global stats */}
              <div className="hidden md:flex items-center gap-5 mr-4">
                <div className="text-center">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Snapshots</p>
                  <p className="text-sm font-bold text-violet-300">{thinkingLog.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Total Chars</p>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-violet-400" />
                    <p className="text-sm font-bold text-violet-300">{totalChars.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            {thinkingLog.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-5">
                  <Brain className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-400 mb-2">No reasoning data available</p>
                <p className="text-xs text-slate-600 max-w-xs">
                  AI reasoning is captured when screening runs with thinking mode enabled. Run a new screening to see Gemini's thought process.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div
                  ref={sidebarRef}
                  className="w-64 flex-shrink-0 border-r border-slate-700/60 bg-slate-900/60 flex flex-col overflow-hidden"
                >
                  {/* Search */}
                  <div className="px-3 py-3 border-b border-slate-700/40">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
                      <Search className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search reasoning…"
                        className="flex-1 bg-transparent text-[11px] text-slate-300 placeholder:text-slate-600 outline-none"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')}>
                          <RotateCcw className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Snapshot list */}
                  <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                    {thinkingLog.map((snap, idx) => {
                      const conf = STAGE_CONFIG[snap.stage] ?? STAGE_CONFIG.evaluating;
                      const isActive = idx === activeIndex;
                      const matchesSearch = searchQuery
                        ? snap.thinking.toLowerCase().includes(searchQuery.toLowerCase())
                        : true;

                      return (
                        <button
                          key={snap.timestamp}
                          data-idx={idx}
                          onClick={() => setActiveIndex(idx)}
                          className={cn(
                            'w-full text-left px-3 py-3 transition-colors border-b border-slate-800/40',
                            isActive
                              ? 'bg-violet-500/10 border-l-2 border-l-violet-500'
                              : 'hover:bg-slate-800/40 border-l-2 border-l-transparent',
                            !matchesSearch && 'opacity-40'
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                              style={{ background: `${conf.color}20`, color: conf.color }}
                            >
                              {conf.label}
                            </span>
                            {matchesSearch && searchQuery && (
                              <span className="text-[9px] text-yellow-400 font-medium">match</span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-slate-300 leading-snug">{snap.batchLabel}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {snap.candidateNames.length} candidate{snap.candidateNames.length !== 1 ? 's' : ''}
                            {' · '}{snap.thinking.length.toLocaleString()} chars
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sidebar nav */}
                  <div className="px-3 py-2.5 border-t border-slate-700/40 flex items-center justify-between bg-slate-900/80">
                    <button
                      onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                      disabled={activeIndex === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {activeIndex + 1} / {thinkingLog.length}
                    </span>
                    <button
                      onClick={() => setActiveIndex(i => Math.min(thinkingLog.length - 1, i + 1))}
                      disabled={activeIndex === thinkingLog.length - 1}
                      className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main thinking panel */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <AnimatePresence mode="wait">
                    {snapshot && (
                      <ThinkingPanel
                        key={`${snapshot.timestamp}-${activeIndex}`}
                        snapshot={snapshot}
                        searchQuery={searchQuery}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-700/60 bg-slate-900/80 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <FileText className="w-3 h-3" />
                <span>Gemini 2.5 Flash Extended Thinking</span>
                <span className="text-slate-700">·</span>
                <ArrowUpRight className="w-3 h-3" />
                <span>Raw reasoning tokens from AI response</span>
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 text-xs font-medium transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
