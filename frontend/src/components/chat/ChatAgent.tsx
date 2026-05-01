'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Minimize2, Mic, MicOff, Volume2, VolumeX,
  Send, Trash2, Bot, User, Loader2, Briefcase, Users, BarChart2,
  CheckCircle, ChevronRight, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat, Message, ChatData, ChatDataItem } from '@/hooks/useChat';
import { useVoice } from '@/hooks/useVoice';

// ─── Quick action chips ───────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Open jobs', icon: Briefcase, prompt: 'Show me all open jobs' },
  { label: 'Top candidates', icon: Users, prompt: 'Show me top scored candidates' },
  { label: 'Hiring stats', icon: BarChart2, prompt: 'Give me an overview of our hiring stats' },
  { label: 'Pending review', icon: CheckCircle, prompt: 'Show candidates in pending stage' },
];

// ─── Inline data card renderers ───────────────────────────────────────────────
function JobCard({ item }: { item: ChatDataItem }) {
  const isActive = Boolean(item.isActive);
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-white/60 border border-slate-200 text-xs">
      <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Briefcase className="w-3.5 h-3.5 text-blue-600" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 truncate">{String(item.title ?? '')}</p>
        <p className="text-slate-500 truncate">
          {[item.department, item.location, item.type].filter(Boolean).join(' · ')}
        </p>
        {Boolean(item.experienceLevel) && (
          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">
            {String(item.experienceLevel)}
          </span>
        )}
      </div>
      <span
        className={cn(
          'ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
          isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        )}
      >
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
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 border border-slate-200 text-xs">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">
        {initials || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 truncate">{name || 'Unknown'}</p>
        {Boolean(item.email) && <p className="text-slate-500 truncate">{String(item.email)}</p>}
        {stage && (
          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium capitalize">
            {stage.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      {score !== null && (
        <div className="flex-shrink-0 text-right">
          <p
            className={cn(
              'text-sm font-bold',
              score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-500'
            )}
          >
            {score.toFixed(0)}
          </p>
          <p className="text-slate-400 text-[10px]">score</p>
        </div>
      )}
    </div>
  );
}

function AnalyticsCard({ summary }: { summary: Record<string, unknown> }) {
  const stats = [
    { label: 'Jobs', value: summary.totalJobs },
    { label: 'Active', value: summary.activeJobs },
    { label: 'Candidates', value: summary.totalCandidates },
    { label: 'Screenings', value: summary.totalScreenings },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      {stats.map((s) => (
        <div key={s.label} className="p-2 rounded-lg bg-white/60 border border-slate-200 text-center">
          <p className="text-base font-bold text-blue-600">{String(s.value ?? 0)}</p>
          <p className="text-[10px] text-slate-500">{s.label}</p>
        </div>
      ))}
      {summary.avgScore !== undefined && (
        <div className="col-span-2 p-2 rounded-lg bg-white/60 border border-slate-200 flex justify-between items-center">
          <span className="text-[10px] text-slate-500">Avg score across all screenings</span>
          <span className="text-sm font-bold text-blue-600">{String(summary.avgScore)}</span>
        </div>
      )}
    </div>
  );
}

function ActionCard({ summary }: { summary: Record<string, unknown> }) {
  const success = Boolean(summary.success);
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border text-xs',
        success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
      )}
    >
      <CheckCircle className={cn('w-4 h-4 flex-shrink-0', success ? 'text-green-600' : 'text-red-500')} />
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

  const shown = items.slice(0, 5);
  const remaining = items.length - shown.length;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {shown.map((item, i) => {
        if (data.type === 'jobs') return <JobCard key={i} item={item} />;
        if (data.type === 'candidates') return <CandidateCard key={i} item={item} />;
        if (data.type === 'screening') {
          return (
            <div key={i} className="p-2 rounded-lg bg-white/60 border border-slate-200 text-xs">
              <p className="font-semibold text-slate-800 truncate">{String(item.jobTitle ?? '')}</p>
              <p className="text-slate-500">
                {String(item.totalApplicants ?? 0)} applicants · {String(item.shortlistSize ?? 0)} shortlisted
              </p>
            </div>
          );
        }
        return null;
      })}
      {remaining > 0 && (
        <p className="text-[10px] text-slate-400 text-center">+{remaining} more</p>
      )}
    </div>
  );
}

// ─── Live voice transcript bubble ────────────────────────────────────────────
function LiveTranscriptBubble({ transcript }: { transcript: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="flex gap-2 flex-row-reverse"
    >
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Mic className="w-3.5 h-3.5 text-white" />
      </div>

      {/* Bubble */}
      <div className="max-w-[82%] flex flex-col items-end">
        {/* Waveform bars above bubble */}
        <div className="flex gap-0.5 items-end h-3 mb-1 pr-1">
          {[2, 4, 3, 5, 3, 4, 2].map((h, i) => (
            <motion.div
              key={i}
              className="w-0.5 bg-red-400 rounded-full"
              animate={{ height: [`${h * 2}px`, `${h * 4}px`, `${h * 2}px`] }}
              transition={{ duration: 0.4 + i * 0.05, repeat: Infinity, delay: i * 0.07 }}
            />
          ))}
        </div>

        <div className="rounded-2xl rounded-tr-sm px-3 py-2 bg-blue-600 text-white text-sm leading-relaxed min-h-[36px] flex items-center">
          {transcript ? (
            <span>
              {transcript}
              {/* blinking cursor */}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-0.5 h-3.5 bg-white ml-0.5 align-middle rounded-full"
              />
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-white/70 text-xs">
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Listening…
              </motion.span>
            </span>
          )}
        </div>

        <span className="text-[10px] text-slate-400 mt-1 px-1">Speaking now</span>
      </div>
    </motion.div>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-violet-500 to-blue-600'
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[82%] flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm'
          )}
        >
          {message.isLoading ? (
            <span className="flex items-center gap-1.5 text-slate-400 text-xs py-0.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </span>
          ) : (
            message.content
          )}
        </div>

        {/* Inline data cards */}
        {!isUser && message.data && !message.isLoading && (
          <div className="w-full max-w-[320px]">
            <DataCards data={message.data} />
          </div>
        )}

        <span className="text-[10px] text-slate-400 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main ChatAgent component ─────────────────────────────────────────────────
export function ChatAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNewReply = useCallback((text: string) => {
    speak(text);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { messages, isLoading, sendMessage, clearMessages } = useChat(handleNewReply);

  const handleFinalTranscript = useCallback(
    (text: string) => {
      setInput('');
      sendMessage(text);
    },
    [sendMessage]
  );

  const {
    isListening,
    isSpeaking,
    transcript,
    voiceEnabled,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoiceEnabled,
    isSupported: voiceSupported,
  } = useVoice(handleFinalTranscript);

  // Clear input when listening starts; don't mirror transcript into the box
  useEffect(() => {
    if (isListening) setInput('');
  }, [isListening]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickAction = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const unreadCount = messages.filter((m) => m.role === 'assistant' && !m.isLoading).length - 1;
  const showBadge = !isOpen && unreadCount > 0;

  return (
    <>
      {/* ── Floating trigger button ── */}
      <motion.button
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'bg-gradient-to-br from-violet-600 to-blue-600 text-white',
          'hover:scale-105 active:scale-95 transition-transform',
          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2'
        )}
        whileTap={{ scale: 0.92 }}
        aria-label="Open AI Agent"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span key="close" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
              <Sparkles className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {/* Pulse ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full animate-ping bg-blue-500 opacity-20" />
        )}
        {/* Unread badge */}
        {showBadge && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            className={cn(
              'fixed bottom-24 right-6 z-50',
              'w-[360px] max-h-[580px] rounded-2xl shadow-2xl',
              'flex flex-col overflow-hidden',
              'border border-slate-200/80',
              'bg-slate-50'
            )}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-none">TalentAI Agent</p>
                <p className="text-[11px] text-white/70 mt-0.5">
                  {isLoading ? 'Thinking...' : isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Online'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {voiceSupported && (
                  <button
                    onClick={toggleVoiceEnabled}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={clearMessages}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
              {/* Quick actions — shown only at start */}
              {messages.length <= 1 && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 text-center font-medium uppercase tracking-wide">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.prompt)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium',
                          'bg-white border border-slate-200 text-slate-700',
                          'hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50',
                          'transition-all text-left shadow-sm'
                        )}
                      >
                        <action.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{action.label}</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {/* Live voice transcript — appears as user speaks */}
              <AnimatePresence>
                {isListening && (
                  <LiveTranscriptBubble transcript={transcript} />
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* ── Speaking indicator ── */}
            {isSpeaking && (
              <div className="flex items-center justify-between px-4 py-1.5 bg-violet-50 border-t border-violet-100">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5 items-end h-3">
                    {[1, 2, 3, 4, 3].map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-violet-500 rounded-full"
                        animate={{ height: [`${h * 4}px`, `${h * 8}px`, `${h * 4}px`] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-violet-600 font-medium">Speaking</span>
                </div>
                <button
                  onClick={stopSpeaking}
                  className="text-[11px] text-violet-500 hover:text-violet-700 font-medium"
                >
                  Stop
                </button>
              </div>
            )}

            {/* ── Input area ── */}
            <div className="px-3 py-2.5 bg-white border-t border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your hiring..."
                  disabled={isLoading || isListening}
                  className={cn(
                    'flex-1 min-w-0 px-3 py-2 rounded-xl text-sm',
                    'bg-slate-100 border border-transparent',
                    'focus:outline-none focus:border-blue-300 focus:bg-white',
                    'placeholder:text-slate-400 text-slate-800',
                    'transition-all disabled:opacity-60'
                  )}
                />

                {/* Mic button */}
                {voiceSupported && (
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      'transition-all focus:outline-none',
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isListening}
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    'bg-blue-600 text-white transition-all',
                    'hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed',
                    'focus:outline-none focus:ring-2 focus:ring-blue-400'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Powered by Gemini · {voiceSupported ? 'Voice enabled' : 'Type to chat'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
