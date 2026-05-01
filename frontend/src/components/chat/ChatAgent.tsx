'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mic, MicOff, Volume2, VolumeX,
  Send, Trash2, Bot, User, Loader2, Briefcase, Users,
  BarChart2, CheckCircle, Sparkles, StopCircle, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat, Message, ChatData, ChatDataItem } from '@/hooks/useChat';
import { useVoice } from '@/hooks/useVoice';

// ─── Constants ────────────────────────────────────────────────────────────────
const PANEL_W = 'w-[380px]';
const PANEL_H = 'h-[560px]';

const QUICK_ACTIONS = [
  { label: 'Open jobs',      icon: Briefcase,    prompt: 'Show me all open jobs' },
  { label: 'Top candidates', icon: Users,         prompt: 'Show me top scored candidates' },
  { label: 'Hiring stats',   icon: BarChart2,     prompt: 'Give me an overview of our hiring stats' },
  { label: 'Pending review', icon: CheckCircle,   prompt: 'Show candidates in pending stage' },
];

// ─── Inline data cards ────────────────────────────────────────────────────────
function JobCard({ item }: { item: ChatDataItem }) {
  const isActive = Boolean(item.isActive);
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Briefcase className="w-4 h-4 text-blue-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 truncate">{String(item.title ?? '')}</p>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">
          {[item.department, item.location].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className={cn(
        'flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold',
        isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
      )}>
        {isActive ? 'Open' : 'Closed'}
      </span>
    </div>
  );
}

function CandidateCard({ item }: { item: ChatDataItem }) {
  const name = item.candidateName
    ? String(item.candidateName)
    : `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim();
  const score = item.finalScore !== undefined ? Number(item.finalScore) : null;
  const stage = String(item.pipelineStatus ?? item.recommendation ?? '');
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const scoreColor = score === null ? '' : score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold">
        {initials || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 truncate">{name || 'Unknown'}</p>
        {stage && (
          <p className="text-[11px] text-slate-400 capitalize mt-0.5">{stage.replace(/_/g, ' ')}</p>
        )}
      </div>
      {score !== null && (
        <span className={cn('text-sm font-bold flex-shrink-0', scoreColor)}>{score.toFixed(0)}</span>
      )}
    </div>
  );
}

function AnalyticsCard({ summary }: { summary: Record<string, unknown> }) {
  const stats = [
    { label: 'Total Jobs',    value: summary.totalJobs,       color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Jobs',   value: summary.activeJobs,      color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Candidates',    value: summary.totalCandidates, color: 'bg-violet-50 text-violet-600' },
    { label: 'Screenings',    value: summary.totalScreenings, color: 'bg-amber-50 text-amber-600' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mt-1">
      {stats.map(s => (
        <div key={s.label} className={cn('rounded-xl p-2.5 text-center', s.color.split(' ')[0])}>
          <p className={cn('text-lg font-bold', s.color.split(' ')[1])}>{String(s.value ?? 0)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
        </div>
      ))}
      {summary.avgScore !== undefined && (
        <div className="col-span-2 flex justify-between items-center px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] text-slate-500">Avg screening score</span>
          <span className="text-sm font-bold text-blue-600">{String(summary.avgScore)}</span>
        </div>
      )}
    </div>
  );
}

function ActionCard({ summary }: { summary: Record<string, unknown> }) {
  const success = Boolean(summary.success);
  return (
    <div className={cn(
      'flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium',
      success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'
    )}>
      <CheckCircle className="w-4 h-4 flex-shrink-0" />
      <span>
        {success
          ? `${summary.candidateName} moved to ${String(summary.newStage ?? '').replace(/_/g, ' ')}`
          : String(summary.message ?? 'Action failed')}
      </span>
    </div>
  );
}

function DataCards({ data }: { data: ChatData }) {
  if (data.type === 'analytics' && data.summary) return <AnalyticsCard summary={data.summary} />;
  if (data.type === 'action' && data.summary) return <ActionCard summary={data.summary} />;

  const items = data.items ?? [];
  if (!items.length) return null;
  const shown = items.slice(0, 4);
  const remaining = items.length - shown.length;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {shown.map((item, i) => {
        if (data.type === 'jobs') return <JobCard key={i} item={item} />;
        if (data.type === 'candidates') return <CandidateCard key={i} item={item} />;
        if (data.type === 'screening') return (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-xs">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-violet-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 truncate">{String(item.jobTitle ?? '')}</p>
              <p className="text-slate-400 mt-0.5">{String(item.totalApplicants ?? 0)} applicants · {String(item.shortlistSize ?? 0)} shortlisted</p>
            </div>
          </div>
        );
        return null;
      })}
      {remaining > 0 && (
        <p className="text-[10px] text-slate-400 text-center py-1">+{remaining} more results</p>
      )}
    </div>
  );
}

// ─── Live voice transcript ────────────────────────────────────────────────────
function LiveTranscriptBubble({ transcript }: { transcript: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2.5 flex-row-reverse items-end"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Mic className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="max-w-[75%] flex flex-col items-end gap-1">
        {/* Waveform */}
        <div className="flex gap-[3px] items-center h-4 px-1">
          {[3,5,7,9,7,5,9,6,4].map((h, i) => (
            <motion.div
              key={i}
              className="w-[3px] bg-rose-400 rounded-full"
              animate={{ height: [`${h}px`, `${h * 1.8}px`, `${h}px`] }}
              transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.06, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm leading-relaxed shadow-md min-h-[40px] flex items-center">
          {transcript ? (
            <>
              {transcript}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-[2px] h-3.5 bg-white/80 ml-1 align-middle rounded-sm"
              />
            </>
          ) : (
            <span className="text-white/60 text-xs italic">Listening…</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const time = message.timestamp.getTime() === 0
    ? ''
    : message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn('flex gap-2.5 items-end', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm',
        isUser
          ? 'bg-gradient-to-br from-blue-500 to-blue-600'
          : 'bg-gradient-to-br from-violet-500 to-indigo-600'
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5 text-white" />
        }
      </div>

      <div className={cn('max-w-[75%] flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'px-4 py-2.5 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
            : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-bl-md'
        )}>
          {message.isLoading ? (
            <span className="flex items-center gap-2 text-slate-400 text-xs">
              <span className="flex gap-1">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay }}
                  />
                ))}
              </span>
              Thinking
            </span>
          ) : message.content}
        </div>

        {!isUser && message.data && !message.isLoading && (
          <div className="w-full">
            <DataCards data={message.data} />
          </div>
        )}

        {time && (
          <span className="text-[10px] text-slate-400 px-1">{time}</span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ChatAgent() {
  const [mounted, setMounted]   = useState(false);
  const [isOpen, setIsOpen]     = useState(false);
  const [input, setInput]       = useState('');
  const messagesEndRef          = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);
  const speakReplyRef           = useRef(false);

  useEffect(() => setMounted(true), []);

  const handleNewReply = useCallback((text: string) => {
    if (speakReplyRef.current) { speak(text); speakReplyRef.current = false; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { messages, isLoading, sendMessage, clearMessages } = useChat(handleNewReply);

  const handleFinalTranscript = useCallback((text: string) => {
    setInput('');
    speakReplyRef.current = true;
    sendMessage(text);
  }, [sendMessage]);

  const {
    isListening, isSpeaking, transcript, voiceEnabled,
    startListening, stopListening, speak, stopSpeaking,
    toggleVoiceEnabled, isSupported: voiceSupported,
  } = useVoice(handleFinalTranscript);

  useEffect(() => { if (isListening) setInput(''); }, [isListening]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 320);
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  if (!mounted) return null;

  const statusLabel = isLoading ? 'Thinking…'
    : isSpeaking    ? 'Speaking…'
    : isListening   ? 'Listening…'
    : 'Online';

  const statusColor = isLoading ? 'bg-amber-400'
    : isSpeaking    ? 'bg-violet-400 animate-pulse'
    : isListening   ? 'bg-red-400 animate-pulse'
    : 'bg-emerald-400';

  return (
    <>
      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setIsOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-2xl shadow-xl',
          'bg-gradient-to-br from-violet-600 via-blue-600 to-blue-500 text-white',
          'flex items-center justify-center',
          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
          'transition-shadow hover:shadow-2xl'
        )}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        aria-label="Open AI Agent"
      >
        <AnimatePresence mode="wait">
          {isOpen
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <X className="w-5 h-5" />
              </motion.span>
            : <motion.span key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <Sparkles className="w-5 h-5" />
              </motion.span>
          }
        </AnimatePresence>
        {/* pulse ring */}
        {!isOpen && <span className="absolute inset-0 rounded-2xl animate-ping bg-blue-500/30 pointer-events-none" />}
      </motion.button>

      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
            className={cn(
              'fixed bottom-[88px] right-6 z-50',
              PANEL_W, PANEL_H,
              'max-h-[calc(100vh-108px)]',
              'rounded-3xl shadow-2xl flex flex-col overflow-hidden',
              'bg-[#f7f8fc] border border-white/60',
              'ring-1 ring-slate-200/80'
            )}
            style={{ boxShadow: '0 32px 64px -12px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.5)' }}
          >

            {/* ── Header ── */}
            <div className="relative flex-shrink-0 px-5 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 overflow-hidden">
              {/* decorative blur circles */}
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />

              <div className="relative flex items-center gap-3">
                {/* AI avatar orb */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white', statusColor)} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">TalentAI Agent</p>
                  <p className="text-white/60 text-[11px] mt-0.5">{statusLabel}</p>
                </div>

                <div className="flex items-center gap-0.5">
                  {voiceSupported && (
                    <button onClick={toggleVoiceEnabled}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all"
                      title={voiceEnabled ? 'Mute TTS' : 'Enable TTS'}
                    >
                      {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={clearMessages}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all"
                    title="Clear chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Speaking bar */}
              <AnimatePresence>
                {isSpeaking && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative flex items-center justify-between mt-3 px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex gap-[3px] items-center h-4">
                        {[4,6,8,6,4,7,5].map((h, i) => (
                          <motion.div key={i} className="w-[3px] bg-white/80 rounded-full"
                            animate={{ height: [`${h}px`, `${h * 1.8}px`, `${h}px`] }}
                            transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.07 }}
                          />
                        ))}
                      </div>
                      <span className="text-white/80 text-xs font-medium">AI is speaking</span>
                    </div>
                    <button onClick={stopSpeaking}
                      className="flex items-center gap-1 text-white/70 hover:text-white text-[11px] font-medium transition-colors"
                    >
                      <StopCircle className="w-3.5 h-3.5" /> Stop
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Messages area ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 scroll-smooth"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
            >
              {/* Quick actions — only at start */}
              {messages.length <= 1 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <p className="text-[11px] text-slate-400 font-semibold text-center uppercase tracking-widest">
                    What can I help with?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.prompt)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-left',
                          'bg-white border border-slate-200 text-slate-600 shadow-sm',
                          'hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/60',
                          'transition-all duration-150 active:scale-95'
                        )}
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <action.icon className="w-3.5 h-3.5 text-slate-500" />
                        </span>
                        {action.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}

              <AnimatePresence>
                {isListening && <LiveTranscriptBubble transcript={transcript} />}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input area ── */}
            <div className="flex-shrink-0 px-4 pb-4 pt-3 bg-[#f7f8fc] border-t border-slate-200/70">
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-2xl',
                'bg-white border shadow-sm transition-all duration-200',
                isListening ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100'
              )}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? 'Listening…' : 'Ask anything about your hiring…'}
                  disabled={isLoading || isListening}
                  className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                />

                {/* Mic */}
                {voiceSupported && (
                  <motion.button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    whileTap={{ scale: 0.88 }}
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                      isListening
                        ? 'bg-red-500 text-white shadow-md shadow-red-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                    title={isListening ? 'Stop' : 'Voice input'}
                  >
                    {isListening
                      ? <MicOff className="w-3.5 h-3.5" />
                      : <Mic className="w-3.5 h-3.5" />
                    }
                  </motion.button>
                )}

                {/* Send */}
                <motion.button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isListening}
                  whileTap={{ scale: 0.88 }}
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                    input.trim() && !isLoading && !isListening
                      ? 'bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-md shadow-blue-200'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  {isLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                </motion.button>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-2 tracking-wide">
                Gemini 2.5 · {voiceSupported ? 'Voice ready' : 'Text only'}
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
