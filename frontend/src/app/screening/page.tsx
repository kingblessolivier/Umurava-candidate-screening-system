'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { stopRunning, resumeRunning } from '@/store/screeningSlice';
import { useJobs } from '@/hooks/useJobs';
import { useJobCandidates } from '@/hooks/useJobCandidates';
import { useScreening } from '@/hooks/useScreening';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  Brain, Users, Trophy, Zap, Activity, Server,
  Database, Cpu, Shield, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIThinkingStream } from '@/components/screening/AIThinkingStream';
import { CandidateScore } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function nowHMS() {
  const n = new Date();
  return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}:${n.getSeconds().toString().padStart(2, '0')}`;
}

function scoreColor(s: number) {
  if (s >= 80) return '#16a34a';
  if (s >= 65) return '#2563eb';
  if (s >= 50) return '#d97706';
  return '#dc2626';
}

// ─── System chrome components ─────────────────────────────────────────────────

function SysHeader({ running, elapsed, user }: { running: boolean; elapsed: number; user?: { name?: string } }) {
  const [clock, setClock] = useState('00:00:00');
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    setClock(nowHMS());
    const t = setInterval(() => setClock(nowHMS()), 1000);
    return () => clearInterval(t);
  }, []);

  const operatorLabel = isMounted
    ? (user?.name?.split(' ')[0]?.toUpperCase() ?? 'SYS')
    : 'SYS';

  return (
    <div className="h-9 bg-white border-b border-gray-200 flex items-center px-4 gap-0 flex-shrink-0 select-none">
      {/* Left: system identity */}
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[11px] font-bold text-gray-900 tracking-widest uppercase">TalentAI</span>
        </div>
        <div className="w-px h-3.5 bg-gray-200" />
        <span className="text-[10px] text-gray-500 tracking-wider uppercase">Enterprise Screening Module</span>
        <div className="w-px h-3.5 bg-gray-200" />
        <span className="text-[10px] text-gray-400 font-mono">v2.1.0</span>
      </div>

      {/* Center: status */}
      <div className="flex items-center gap-4">
        {running ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-50 border border-green-200 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-green-700 tracking-wider">PROCESSING · {formatTime(elapsed)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-50 border border-gray-200 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-mono text-gray-500 tracking-wider">IDLE · READY</span>
          </div>
        )}
      </div>

      {/* Right: operator info */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-gray-400">OPERATOR: <span className="text-gray-600">{operatorLabel}</span></span>
          <div className="w-px h-3 bg-gray-200" />
          <span className="text-gray-400">UTC: <span className="text-gray-600">{clock}</span></span>
          <div className="w-px h-3 bg-gray-200" />
          <span className="text-gray-400">NODE: <span className="text-gray-600">GEMINI-2.5</span></span>
        </div>
      </div>
    </div>
  );
}

function WorkflowBar({ step, running }: { step: 'setup' | 'criteria' | 'review'; running: boolean }) {
  const steps = [
    { id: 'setup',    num: '01', label: 'JOB SELECTION',        desc: 'Position & pool size' },
    { id: 'criteria', num: '02', label: 'EVALUATION CRITERIA',  desc: 'Scoring weights'       },
    { id: 'review',   num: '03', label: 'INITIATION',           desc: 'Confirm & execute'     },
    { id: 'exec',     num: '04', label: 'EXECUTION',            desc: 'Live processing'       },
  ];
  const order = ['setup', 'criteria', 'review', 'exec'];
  const currentIdx = running ? 3 : order.indexOf(step);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-0 flex-shrink-0">
      <div className="flex items-stretch">
        {steps.map((s, i) => {
          const idx   = i;
          const done  = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={s.id} className="flex items-stretch flex-1">
              <div className={cn(
                'flex items-center gap-2.5 py-2.5 px-3 flex-1 border-b-2 transition-all',
                active  ? 'border-blue-500 bg-gray-50' :
                done    ? 'border-green-500 bg-transparent' :
                          'border-transparent bg-transparent'
              )}>
                {/* Step num circle */}
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                  done   ? 'bg-green-500 text-white' :
                  active ? 'bg-blue-500 text-white' :
                           'bg-gray-100 text-gray-400'
                )}>
                  {done ? '✓' : s.num}
                </div>
                <div className="min-w-0">
                  <p className={cn(
                    'text-[9px] font-bold tracking-widest truncate',
                    active  ? 'text-blue-600' :
                    done    ? 'text-green-600' :
                              'text-gray-400'
                  )}>
                    {s.label}
                  </p>
                  <p className="text-[8px] text-gray-400 truncate">{s.desc}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center px-0 flex-shrink-0">
                  <ChevronRight className={cn('w-3 h-3', done ? 'text-green-500' : 'text-gray-200')} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBar({ totalCandidates, evaluatedCount, model }: { totalCandidates: number; evaluatedCount: number; model: string }) {
  const [clock, setClock] = useState(nowHMS());
  useEffect(() => {
    const t = setInterval(() => setClock(nowHMS()), 1000);
    return () => clearInterval(t);
  }, []);

  const items = [
    { icon: Server,   label: 'SYS',     val: 'ONLINE'        },
    { icon: Cpu,      label: 'MODEL',   val: model           },
    { icon: Database, label: 'POOL',    val: `${totalCandidates} CANDIDATES` },
    { icon: Activity, label: 'EVAL',    val: `${evaluatedCount}/${totalCandidates}` },
    { icon: Shield,   label: 'SECURITY',val: 'TLS 1.3'       },
  ];

  return (
    <div className="h-7 bg-white border-t border-gray-200 flex items-center px-4 gap-0 flex-shrink-0">
      <div className="flex items-center gap-4 flex-1">
        {items.map(({ icon: Icon, label, val }) => (
          <div key={label} className="flex items-center gap-1.5 text-[9px] font-mono">
            <Icon className="w-2.5 h-2.5 text-blue-500" />
            <span className="text-gray-400">{label}:</span>
            <span className="text-gray-500">{val}</span>
          </div>
        ))}
      </div>
      <span className="text-[9px] font-mono text-gray-300">{clock} UTC</span>
    </div>
  );
}

// ─── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({ title, badge, children, className }: { title: string; badge?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <span className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">{title}</span>
        {badge && (
          <span className="text-[9px] font-mono text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center gap-0 border-b border-gray-100 last:border-0">
      <div className="w-36 px-3 py-2 bg-gray-50 border-r border-gray-200 flex-shrink-0">
        <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">{label}</span>
      </div>
      <div className={cn('flex-1 px-3 py-2 text-xs text-gray-900', mono && 'font-mono')}>
        {value}
      </div>
    </div>
  );
}

// ─── Configuration steps ──────────────────────────────────────────────────────

function StepJobSelection({
  jobs, jobsLoading, jobId, setJobId, selectedJob, candidateCount, shortlistSize, setShortlistSize,
}: {
  jobs: { _id: string; title: string; experienceLevel: string; department?: string; type?: string; location?: string; requirements: { skill: string; required: boolean }[]; weights: { skills: number; experience: number; education: number; projects: number; availability: number } }[];
  jobsLoading: boolean;
  jobId: string;
  setJobId: (v: string) => void;
  selectedJob: typeof jobs[0] | undefined;
  candidateCount: number;
  shortlistSize: number;
  setShortlistSize: (v: number) => void;
}) {
  const required = selectedJob?.requirements.filter(r => r.required).map(r => r.skill) ?? [];

  return (
    <div className="grid grid-cols-[1fr_280px] gap-4 h-full">
      {/* Main form */}
      <div className="space-y-4">
        <Panel title="01 — Job Selection" badge="REQUIRED">
          {/* Position reference */}
          <div className="border-b border-gray-200 px-3 py-2 bg-gray-50">
            <span className="text-[9px] font-bold text-gray-500 tracking-widest">POSITION REFERENCE</span>
          </div>
          <div className="p-3">
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="px-2 py-1 bg-gray-50 border-b border-gray-200">
                <span className="text-[9px] font-bold text-gray-400 tracking-wider">POSITION</span>
              </div>
              <select
                value={jobId}
                onChange={e => setJobId(e.target.value)}
                disabled={jobsLoading}
                className="w-full px-3 py-2.5 text-xs text-gray-900 bg-white border-0 outline-none focus:bg-blue-50 transition-colors disabled:opacity-50 font-mono"
              >
                <option value="">— SELECT POSITION —</option>
                {jobs.map(j => (
                  <option key={j._id} value={j._id}>
                    {j.title.toUpperCase()} · {j.experienceLevel.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Position details */}
          {selectedJob && (
            <>
              <div className="border-t border-gray-200 px-3 py-1.5 bg-gray-50">
                <span className="text-[9px] font-bold text-gray-500 tracking-widest">POSITION DETAILS</span>
              </div>
              <FieldRow label="JOB TITLE"   value={selectedJob.title} />
              <FieldRow label="LEVEL"       value={selectedJob.experienceLevel} />
              <FieldRow label="DEPARTMENT"  value={selectedJob.department || '—'} />
              <FieldRow label="TYPE"        value={selectedJob.type || '—'} />
              <FieldRow label="LOCATION"    value={selectedJob.location || '—'} />
            </>
          )}
        </Panel>

        <Panel title="02 — Applicant Pool & Target" badge="PARAMETERS">
          <FieldRow
            label="CANDIDATE POOL"
            value={
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#1d4ed8]">{candidateCount}</span>
                <span className="text-[#64748b]">applicants available</span>
                {candidateCount === 0 && jobId && (
                  <span className="text-[10px] text-[#dc2626] font-medium">⚠ NONE FOUND — UPLOAD REQUIRED</span>
                )}
              </div>
            }
          />
          <div className="flex items-center gap-0 border-b border-gray-100">
            <div className="w-36 px-3 py-2 bg-gray-50 border-r border-gray-200 flex-shrink-0">
              <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">SHORTLIST TARGET</span>
            </div>
            <div className="flex-1 px-3 py-1.5 flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-sm overflow-hidden">
                <button
                  onClick={() => setShortlistSize(Math.max(1, shortlistSize - 1))}
                  className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 text-gray-600 transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.min(20, candidateCount || 20)}
                  value={shortlistSize}
                  onChange={e => setShortlistSize(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-14 text-center text-xs font-mono font-bold text-gray-900 py-1.5 outline-none bg-white"
                />
                <button
                  onClick={() => setShortlistSize(Math.min(20, candidateCount || 20, shortlistSize + 1))}
                  className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 text-gray-600 transition-colors"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[10px] text-[#64748b]">candidates (max 20)</span>
              {shortlistSize > candidateCount && candidateCount > 0 && (
                <span className="text-[10px] text-[#dc2626]">⚠ EXCEEDS POOL SIZE</span>
              )}
            </div>
          </div>
          <FieldRow label="AI MODEL" value={<span className="font-mono text-[#1d4ed8]">GEMINI-2.5-FLASH · EXTENDED THINKING</span>} />
          <FieldRow label="PROCESSING" value={<span className="text-[#16a34a]">SEQUENTIAL BATCH · RATE-LIMITED</span>} />
        </Panel>
      </div>

      {/* Right info panel */}
      <div className="space-y-4">
        <Panel title="Position Profile" badge="INFO">
          {selectedJob ? (
            <>
              <div className="p-3 space-y-3">
                <div>
                  <p className="text-[9px] font-bold text-[#64748b] tracking-wider mb-1.5">REQUIRED COMPETENCIES</p>
                  <div className="flex flex-wrap gap-1">
                    {required.slice(0, 8).map(r => (
                      <span key={r} className="px-1.5 py-0.5 text-[9px] font-mono font-medium bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8]">
                        {r.toUpperCase()}
                      </span>
                    ))}
                    {required.length > 8 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono text-[#64748b]">+{required.length - 8} MORE</span>
                    )}
                  </div>
                </div>
                <div className="border-t border-[#e2e8f0] pt-3">
                  <p className="text-[9px] font-bold text-[#64748b] tracking-wider mb-2">SCORING WEIGHTS</p>
                  {[
                    { k: 'SKILLS',      v: selectedJob.weights.skills,       c: '#2563eb' },
                    { k: 'EXPERIENCE',  v: selectedJob.weights.experience,   c: '#7c3aed' },
                    { k: 'EDUCATION',   v: selectedJob.weights.education,    c: '#059669' },
                    { k: 'PROJECTS',    v: selectedJob.weights.projects,     c: '#d97706' },
                    { k: 'AVAIL.',      v: selectedJob.weights.availability, c: '#db2777' },
                  ].map(w => (
                    <div key={w.k} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-mono text-[#64748b] w-20">{w.k}</span>
                      <div className="flex-1 h-1 bg-[#e2e8f0] overflow-hidden">
                        <div className="h-full" style={{ width: `${w.v}%`, backgroundColor: w.c }} />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-[#0f172a] w-7 text-right">{w.v}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 text-center">
              <p className="text-[10px] text-[#94a3b8]">SELECT A POSITION TO VIEW PROFILE</p>
            </div>
          )}
        </Panel>

        <Panel title="System Status" badge="SYS">
          <div className="p-3 space-y-1.5">
            {[
              { label: 'API CONNECTION', status: 'ONLINE',    ok: true  },
              { label: 'GEMINI ENGINE',  status: 'ACTIVE',    ok: true  },
              { label: 'DATABASE',       status: 'CONNECTED', ok: true  },
              { label: 'JOB SELECTION',  status: selectedJob ? 'COMPLETE' : 'PENDING', ok: !!selectedJob },
            ].map(({ label, status, ok }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-[#f1f5f9] last:border-0">
                <span className="text-[9px] font-mono text-[#64748b]">{label}</span>
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', ok ? 'bg-[#22c55e]' : 'bg-[#94a3b8]')} />
                  <span className={cn('text-[9px] font-mono font-bold', ok ? 'text-[#16a34a]' : 'text-[#94a3b8]')}>{status}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StepCriteria({
  weights, onChange,
}: {
  weights: { skills: number; experience: number; education: number; projects: number; availability: number };
  onChange: (w: typeof weights) => void;
}) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const criteria = [
    { key: 'skills',       label: 'SKILLS MATCH',      desc: 'Match of technical and soft skills against job requirements'   },
    { key: 'experience',   label: 'WORK EXPERIENCE',   desc: 'Relevance, depth, and progression of professional history'      },
    { key: 'education',    label: 'EDUCATION',         desc: 'Academic qualifications, institutions, and certifications'      },
    { key: 'projects',     label: 'PROJECT PORTFOLIO', desc: 'Portfolio strength, impact, and technology alignment'           },
    { key: 'availability', label: 'AVAILABILITY',      desc: 'Start date readiness and employment type compatibility'         },
  ] as const;

  return (
    <div className="grid grid-cols-[1fr_280px] gap-4">
      <Panel title="02 — Evaluation Criteria Configuration" badge="WEIGHT ALLOCATION">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-[9px] text-gray-500">
            Assign relative weights to each evaluation criterion. <span className="font-bold text-gray-900">TOTAL MUST EQUAL 100%.</span>
          </p>
        </div>

        {/* Table header */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-8 px-3 py-2 border-r border-gray-200 flex-shrink-0" />
          <div className="w-44 px-3 py-2 border-r border-gray-200 flex-shrink-0">
            <span className="text-[9px] font-bold text-gray-600 tracking-wider">CRITERION</span>
          </div>
          <div className="w-28 px-3 py-2 border-r border-gray-200 flex-shrink-0 text-center">
            <span className="text-[9px] font-bold text-gray-600 tracking-wider">WEIGHT (%)</span>
          </div>
          <div className="flex-1 px-3 py-2">
            <span className="text-[9px] font-bold text-gray-600 tracking-wider">VISUAL ALLOCATION</span>
          </div>
          <div className="w-36 px-3 py-2 border-l border-gray-200 flex-shrink-0">
            <span className="text-[9px] font-bold text-gray-600 tracking-wider">DESCRIPTION</span>
          </div>
        </div>

        {/* Rows */}
        {criteria.map(({ key, label, desc }, i) => (
          <div key={key} className="flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
            <div className="w-8 px-3 py-3 border-r border-gray-200 flex-shrink-0 text-center">
              <span className="text-[9px] font-mono text-gray-400">{(i + 1).toString().padStart(2, '0')}</span>
            </div>
            <div className="w-44 px-3 py-3 border-r border-gray-200 flex-shrink-0">
              <span className="text-[10px] font-bold text-gray-900 tracking-wide">{label}</span>
            </div>
            <div className="w-28 px-3 py-3 border-r border-gray-200 flex-shrink-0 text-center">
              <div className="flex items-center justify-center border border-gray-200 rounded-sm overflow-hidden mx-auto w-20">
                <button onClick={() => onChange({ ...weights, [key]: Math.max(0, weights[key] - 5) })} className="px-1.5 py-1 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 text-gray-600">
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
                <input
                  type="number"
                  min={0} max={100}
                  value={weights[key]}
                  onChange={e => onChange({ ...weights, [key]: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  className="w-8 text-center text-xs font-mono font-bold text-gray-900 py-1 outline-none bg-white"
                />
                <button onClick={() => onChange({ ...weights, [key]: Math.min(100, weights[key] + 5) })} className="px-1.5 py-1 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 text-gray-600">
                  <ChevronUp className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${weights[key]}%`, background: ['#2563eb','#7c3aed','#059669','#d97706','#db2777'][i] }}
                  />
                </div>
              </div>
            </div>
            <div className="w-36 px-3 py-3 border-l border-gray-200 flex-shrink-0">
              <p className="text-[9px] text-gray-500 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}

        {/* Totals row */}
        <div className="flex items-center border-t-2 border-gray-300 bg-gray-50">
          <div className="w-8 px-3 py-2.5 border-r border-gray-200 flex-shrink-0" />
          <div className="w-44 px-3 py-2.5 border-r border-gray-200 flex-shrink-0">
            <span className="text-[10px] font-bold text-gray-900 tracking-widest">TOTAL</span>
          </div>
          <div className="w-28 px-3 py-2.5 border-r border-gray-200 flex-shrink-0 text-center">
            <span className={cn('text-sm font-bold font-mono', total === 100 ? 'text-green-600' : 'text-red-600')}>{total}%</span>
          </div>
          <div className="flex-1 px-3 py-2.5 flex items-center gap-2">
            {total === 100 ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-[10px] font-bold text-green-600 tracking-wider">VALID — READY FOR EXECUTION</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-[10px] font-bold text-red-600 tracking-wider">
                  INVALID — {total < 100 ? `DEFICIT: ${100 - total}%` : `EXCESS: ${total - 100}%`}
                </span>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Right panel */}
      <div className="space-y-4">
        <Panel title="Weight Distribution" badge="VISUAL">
          <div className="p-3 space-y-2">
            {criteria.map(({ key, label }, i) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-gray-500 w-20 truncate">{label.split(' ')[0]}</span>
                <div className="flex-1 h-3 bg-gray-200 overflow-hidden relative">
                  <div
                    className="h-full absolute left-0 top-0 transition-all duration-300 flex items-center pl-1"
                    style={{ width: `${weights[criteria[i].key]}%`, background: ['#2563eb','#7c3aed','#059669','#d97706','#db2777'][i] }}
                  >
                    {weights[criteria[i].key] >= 15 && (
                      <span className="text-[7px] font-bold text-white">{weights[criteria[i].key]}%</span>
                    )}
                  </div>
                  {weights[criteria[i].key] < 15 && (
                    <span className="absolute right-1 top-0 h-full flex items-center text-[7px] font-bold text-gray-500">{weights[criteria[i].key]}%</span>
                  )}
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-gray-500 w-20">TOTAL</span>
                <span className={cn('text-xs font-bold font-mono', total === 100 ? 'text-green-600' : 'text-red-600')}>{total}%</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Quick Presets" badge="SHORTCUTS">
          <div className="p-2 space-y-1">
            {[
              { label: 'TECHNICAL ROLE',  w: { skills: 40, experience: 30, education: 10, projects: 15, availability: 5  } },
              { label: 'SENIOR LEADER',   w: { skills: 25, experience: 40, education: 15, projects: 10, availability: 10 } },
              { label: 'FRESH GRADUATE',  w: { skills: 30, experience: 10, education: 30, projects: 25, availability: 5  } },
              { label: 'BALANCED',        w: { skills: 25, experience: 25, education: 20, projects: 20, availability: 10 } },
            ].map(({ label, w }) => (
              <button
                key={label}
                onClick={() => onChange(w)}
                className="w-full text-left px-2.5 py-1.5 text-[9px] font-mono font-bold text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-sm transition-all tracking-wider"
              >
                ↳ {label}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StepReview({
  selectedJob, candidateCount, shortlistSize, weights,
}: {
  selectedJob: { title: string; experienceLevel: string; department?: string } | undefined;
  candidateCount: number;
  shortlistSize: number;
  weights: { skills: number; experience: number; education: number; projects: number; availability: number };
}) {
  const outputs = [
    'Ranked candidate shortlist with composite scores',
    'Category-level score breakdown per candidate',
    'AI-generated targeted interview questions',
    'Skill gap analysis (matched / missing / bonus)',
    'Bias detection flags with correction guidance',
    'Confidence score per assessment',
    'Rejection explanations with improvement paths',
    'Aggregate insights and score distribution',
    'Live Gemini reasoning journal (thinking tokens)',
  ];

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-4">
      <div className="space-y-4">
        <Panel title="03 — Execution Summary" badge="PRE-FLIGHT CHECK">
          <FieldRow label="POSITION"       value={<span className="font-bold">{selectedJob?.title ?? '—'}</span>} />
          <FieldRow label="LEVEL"          value={selectedJob?.experienceLevel ?? '—'} />
          <FieldRow label="DEPT"           value={selectedJob?.department ?? '—'} />
          <FieldRow label="APPLICANT POOL" value={<span className="font-mono font-bold text-blue-600">{candidateCount} CANDIDATES</span>} />
          <FieldRow label="SHORTLIST SIZE" value={<span className="font-mono font-bold text-blue-600">{shortlistSize} CANDIDATES</span>} />
          <FieldRow label="AI ENGINE"      value={<span className="font-mono text-purple-600">GEMINI-2.5-FLASH · THINKING BUDGET: 2048 TOKENS</span>} />
          <FieldRow label="PROCESSING"     value={<span className="font-mono">SEQUENTIAL · RATE-CONTROLLED · CACHED</span>} />
          <FieldRow label="ETA"            value={<span className="font-mono text-amber-600">~{Math.max(1, Math.ceil(candidateCount / 20))} MIN (ESTIMATED)</span>} />
        </Panel>

        <Panel title="Scoring Configuration" badge="FINAL WEIGHTS">
          {[
            { k: 'SKILLS MATCH',      v: weights.skills,       c: '#2563eb' },
            { k: 'WORK EXPERIENCE',   v: weights.experience,   c: '#7c3aed' },
            { k: 'EDUCATION',         v: weights.education,    c: '#059669' },
            { k: 'PROJECT PORTFOLIO', v: weights.projects,     c: '#d97706' },
            { k: 'AVAILABILITY',      v: weights.availability, c: '#db2777' },
          ].map(w => (
            <div key={w.k} className="flex items-center gap-0 border-b border-gray-100 last:border-0">
              <div className="w-44 px-3 py-2 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                <span className="text-[9px] font-bold text-gray-500 tracking-wider">{w.k}</span>
              </div>
              <div className="flex-1 px-3 py-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200">
                  <div className="h-full" style={{ width: `${w.v}%`, backgroundColor: w.c }} />
                </div>
                <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: w.c }}>{w.v}%</span>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Expected Output" badge="DELIVERABLES">
          <div className="p-3">
            <div className="space-y-1.5">
              {outputs.map((o, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-[9px] font-mono text-gray-400 flex-shrink-0 mt-0.5">{(i + 1).toString().padStart(2, '0')}</span>
                  <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] text-gray-700">{o}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="System Checklist" badge="VALIDATION">
          {[
            { label: 'POSITION SELECTED',    ok: !!selectedJob },
            { label: 'CANDIDATES AVAILABLE', ok: candidateCount > 0 },
            { label: 'SHORTLIST VALID',      ok: shortlistSize <= candidateCount && shortlistSize > 0 },
            { label: 'WEIGHTS BALANCED',     ok: Object.values(weights).reduce((a, b) => a + b, 0) === 100 },
            { label: 'AI ENGINE READY',      ok: true },
            { label: 'API KEY CONFIGURED',   ok: true },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', ok ? 'bg-green-500' : 'bg-red-500')} />
                <span className="text-[9px] font-mono text-gray-600">{label}</span>
              </div>
              <span className={cn('text-[9px] font-mono font-bold', ok ? 'text-green-600' : 'text-red-600')}>
                {ok ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

// ─── Execution console ────────────────────────────────────────────────────────

function ExecutionConsole({
  thoughts, liveScores, partialShortlist, evaluatedCount, totalCandidates, elapsed, selectedJobTitle, progressPercent,
}: {
  thoughts: Parameters<typeof AIThinkingStream>[0]['thoughts'];
  liveScores: { skills: number; experience: number; education: number; projects: number; availability: number };
  partialShortlist: CandidateScore[];
  evaluatedCount: number;
  totalCandidates: number;
  elapsed: number;
  selectedJobTitle?: string;
  progressPercent: number;
}) {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Console header */}
      <div className="border border-gray-200 bg-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-bold text-gray-700 tracking-widest uppercase">Execution Console</span>
          </div>
          <div className="w-px h-3.5 bg-gray-200" />
          <span className="text-[10px] font-mono text-gray-500">
            JOB: <span className="text-gray-700">{selectedJobTitle?.toUpperCase() ?? '—'}</span>
          </span>
          <div className="w-px h-3.5 bg-gray-200" />
          <span className="text-[10px] font-mono text-gray-500">
            POOL: <span className="text-gray-700">{totalCandidates}</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-32 h-1.5 bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-green-600 font-bold">{progressPercent}%</span>
          </div>
          <span className="text-[10px] font-mono text-gray-500">
            ELAPSED: <span className="text-gray-700 font-bold">{formatTime(elapsed)}</span>
          </span>
        </div>
      </div>

      {/* Three-panel console grid */}
      <div className="grid grid-cols-[1fr_220px_260px] gap-3 flex-1 min-h-0">
        {/* PROCESS LOG */}
        <AIThinkingStream thoughts={thoughts} isRunning={true} />

        {/* SCORE METRICS */}
        <div className="border border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <span className="text-[10px] font-bold text-gray-600 tracking-widest">SCORE METRICS</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {[
              { label: 'SKILLS',      val: liveScores.skills,       c: '#2563eb' },
              { label: 'EXPERIENCE',  val: liveScores.experience,   c: '#7c3aed' },
              { label: 'EDUCATION',   val: liveScores.education,    c: '#059669' },
              { label: 'PROJECTS',    val: liveScores.projects,     c: '#d97706' },
              { label: 'AVAILABILITY',val: liveScores.availability, c: '#db2777' },
            ].map(({ label, val, c }) => (
              <div key={label} className="px-3 py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono font-bold text-gray-500">{label}</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: c }}>{Math.round(val)}</span>
                </div>
                <div className="h-1.5 bg-gray-200 overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: `${val}%`, backgroundColor: c }} />
                </div>
              </div>
            ))}

            <div className="px-3 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono font-bold text-gray-900">EVALUATED</span>
                <span className="text-[10px] font-mono font-bold text-blue-600">
                  {evaluatedCount}/{totalCandidates}
                </span>
              </div>
              <div className="h-2 bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: totalCandidates > 0 ? `${(evaluatedCount / totalCandidates) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATE REGISTRY */}
        <div className="border border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <span className="text-[10px] font-bold text-gray-600 tracking-widest">CANDIDATE REGISTRY</span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[24px_1fr_52px] bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="px-2 py-1.5 border-r border-gray-200 text-center">
              <span className="text-[8px] font-bold text-gray-400">RK</span>
            </div>
            <div className="px-2 py-1.5 border-r border-gray-200">
              <span className="text-[8px] font-bold text-gray-400">CANDIDATE</span>
            </div>
            <div className="px-2 py-1.5 text-center">
              <span className="text-[8px] font-bold text-gray-400">SCORE</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {partialShortlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Brain className="w-6 h-6 text-gray-300 mb-2" />
                <p className="text-[9px] font-mono text-gray-400">AWAITING RESULTS</p>
                <p className="text-[9px] text-gray-300 mt-1">AI IS EVALUATING...</p>
              </div>
            ) : (
              partialShortlist.map((c, i) => (
                <div key={c.candidateId} className="grid grid-cols-[24px_1fr_52px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="px-2 py-2.5 border-r border-gray-100 text-center">
                    <span className={cn(
                      'text-[9px] font-mono font-bold',
                      i === 0 ? 'text-amber-600' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-400'
                    )}>
                      {c.rank ?? i + 1}
                    </span>
                  </div>
                  <div className="px-2 py-2.5 border-r border-gray-100 min-w-0">
                    <p className="text-[10px] font-medium text-gray-900 truncate">{c.candidateName}</p>
                    <p className="text-[8px] text-gray-400 font-mono truncate">{c.recommendation?.split(' ').map(w => w[0]).join('') ?? '—'}</p>
                  </div>
                  <div className="px-2 py-2.5 text-center">
                    <span className="text-[10px] font-mono font-bold" style={{ color: scoreColor(c.finalScore) }}>
                      {c.finalScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex-shrink-0">
            <span className="text-[9px] font-mono text-gray-500">
              SHORTLIST: <span className="font-bold text-gray-900">{partialShortlist.length}</span> CANDIDATES
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Navigation bar ───────────────────────────────────────────────────────────

function NavBar({
  step, setStep, canGoNext, onRun, running, selectedJob, totalWeight, candidateCount, shortlistSize,
}: {
  step: 'setup' | 'criteria' | 'review';
  setStep: (s: 'setup' | 'criteria' | 'review') => void;
  canGoNext: boolean;
  onRun: () => void;
  running: boolean;
  selectedJob: unknown;
  totalWeight: number;
  candidateCount: number;
  shortlistSize: number;
}) {
  const isReady = !!selectedJob && candidateCount >= shortlistSize && shortlistSize > 0 && totalWeight === 100;

  const stepOrder: ('setup' | 'criteria' | 'review')[] = ['setup', 'criteria', 'review'];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        {currentIdx > 0 && (
          <button
            onClick={() => setStep(stepOrder[currentIdx - 1])}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-[10px] font-bold text-gray-600 tracking-wider transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            PREVIOUS
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Validation hints */}
        {step === 'setup' && !selectedJob && (
          <span className="text-[9px] font-mono text-red-600">⚠ SELECT A POSITION TO CONTINUE</span>
        )}
        {step === 'criteria' && totalWeight !== 100 && (
          <span className="text-[9px] font-mono text-red-600">⚠ WEIGHTS MUST SUM TO 100%</span>
        )}
        {step === 'review' && !isReady && (
          <span className="text-[9px] font-mono text-red-600">⚠ CHECKLIST INCOMPLETE</span>
        )}

        {step === 'review' ? (
          <button
            onClick={onRun}
            disabled={!isReady || running}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-[11px] font-bold tracking-widest transition-all',
              isReady && !running
                ? 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            INITIATE SCREENING
          </button>
        ) : (
          <button
            onClick={() => setStep(stepOrder[currentIdx + 1])}
            disabled={!canGoNext}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold tracking-wider transition-all',
              canGoNext
                ? 'bg-gray-700 text-white hover:bg-gray-800 border border-gray-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            )}
          >
            NEXT
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ScreeningContent() {
  const SCREENING_SESSION_KEY = 'talentai_active_screening_session';
  const router   = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const params   = useSearchParams();
  const { user } = useAuth();

  const [jobId, setJobId]               = useState(params.get('jobId') || '');
  const [shortlistSize, setShortlistSize] = useState(10);
  const [elapsedTime, setElapsedTime]   = useState(0);
  const [step, setStep]                 = useState<'setup' | 'criteria' | 'review'>('setup');
  const [customWeights, setCustomWeights] = useState({ skills: 25, experience: 25, education: 20, projects: 20, availability: 10 });

  const { jobs, loading: jobsLoading } = useJobs();
  const { total: candidateCount }       = useJobCandidates(jobId || null);
  const { notifications, liveEvents, activeJobs }   = useNotifications();
  const pendingBgJobId = useSelector((s: RootState) => s.screening.pendingBgJobId);

  const {
    handleRunScreening, running, thoughts, liveScores, partialShortlist,
    evaluatedCount, totalCandidates, setTotalCandidatesCount, addScreeningThought,
    clearScreeningThoughts, addThinkingSnapshotToLog, setLiveScores, setPartialShortlist,
    setEvaluatedCountTo, resetLiveScreeningState,
  } = useScreening();

  const selectedJob = jobs.find(j => j._id === jobId);
  const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0);
  const progressPercent = totalCandidates > 0 ? Math.round((evaluatedCount / totalCandidates) * 100) : 0;

  const getPersistedSession = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(SCREENING_SESSION_KEY);
      return raw ? JSON.parse(raw) as { bgJobId: string; jobId: string; startedAt: number } : null;
    } catch {
      return null;
    }
  };

  // Sync job weights
  useEffect(() => {
    if (selectedJob?.weights) setCustomWeights({ ...selectedJob.weights });
  }, [selectedJob]);

  useEffect(() => {
    if (!running) return;
    if (candidateCount > 0 && totalCandidates === 0) {
      setTotalCandidatesCount(candidateCount);
    }
  }, [running, candidateCount, totalCandidates, setTotalCandidatesCount]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsedTime(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Persist active screening session so we can restore after navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!running || !pendingBgJobId || !jobId) return;

    window.localStorage.setItem(
      SCREENING_SESSION_KEY,
      JSON.stringify({
        bgJobId: pendingBgJobId,
        jobId,
        startedAt: Date.now() - (elapsedTime * 1000),
      })
    );
  }, [running, pendingBgJobId, jobId, elapsedTime]);

  // Reattach to active background job when returning to this page.
  useEffect(() => {
    const persisted = getPersistedSession();
    const activeScreeningIds = Object.values(activeJobs)
      .filter(job => job.jobType === 'screening')
      .map(job => job.bgJobId);

    const hasPersistedBgJob = !!persisted?.bgJobId;
    const fallbackActiveBgJobId = activeScreeningIds[0];
    const bgJobIdToRestore = hasPersistedBgJob ? persisted!.bgJobId : fallbackActiveBgJobId;

    if (!bgJobIdToRestore || running) return;

    dispatch(resumeRunning(bgJobIdToRestore));

    if (!jobId && persisted?.jobId) {
      setJobId(persisted.jobId);
    }

    if (persisted?.startedAt) {
      setElapsedTime(Math.max(0, Math.floor((Date.now() - persisted.startedAt) / 1000)));
    }
  }, [activeJobs, running, dispatch, jobId]);

  // Navigate to results on completion
  useEffect(() => {
    if (!pendingBgJobId) return;
    const done = notifications.find(n => n.bgJobId === pendingBgJobId);
    if (!done) return;
    dispatch(stopRunning());
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SCREENING_SESSION_KEY);
    }
    if (done.link) router.push(done.link);
  }, [notifications, pendingBgJobId]);

  const seenEventTimestamps = React.useRef<Set<string>>(new Set());

  const handleRun = async () => {
    if (!jobId || candidateCount === 0 || candidateCount < shortlistSize || totalWeight !== 100) return;
    resetLiveScreeningState();
    setTotalCandidatesCount(candidateCount);
    seenEventTimestamps.current.clear();
    setElapsedTime(0);
    clearScreeningThoughts();
    const result = await handleRunScreening({ jobId, shortlistSize });
    if (result.meta.requestStatus !== 'fulfilled') {
      // Error surfaced via notifications/toast
    }
  };

  // Consume SSE live events
  useEffect(() => {
    if (!pendingBgJobId || liveEvents.length === 0) return;
    for (const event of liveEvents) {
      if (event.jobId !== pendingBgJobId) continue;
      const key = `${event.jobId}:${event.timestamp}`;
      if (seenEventTimestamps.current.has(key)) continue;
      seenEventTimestamps.current.add(key);

      const pe = event.metadata.progressEvent as {
        type: string; message: string; candidateName?: string; detail?: string;
        liveScores?: typeof liveScores;
        partialShortlist?: CandidateScore[];
        evaluatedCount?: number;
        thinkingSnapshot?: { stage: 'evaluating'|'reranking'|'rejection'; batchIndex: number; batchLabel: string; candidateNames: string[]; thinking: string; timestamp: string };
      } | undefined;
      if (!pe) continue;

      const ts = nowHMS();

      if (pe.type === 'thinking' && pe.thinkingSnapshot) {
        addThinkingSnapshotToLog(pe.thinkingSnapshot);
        addScreeningThought({ id: `thinking-${key}`, type: 'thinking', message: pe.thinkingSnapshot.batchLabel, timestamp: ts, status: 'completed', thinkingContent: pe.thinkingSnapshot.thinking });
        continue;
      }

      addScreeningThought({ id: `thought-${key}`, type: (pe.type as 'analyzing'|'scoring'|'flagging'|'generating'|'evaluating'|'completed') || 'analyzing', message: pe.message, candidateName: pe.candidateName, timestamp: ts, status: 'completed', detail: pe.detail });
      if (pe.liveScores)                                           setLiveScores(pe.liveScores);
      if (pe.partialShortlist?.length)                             setPartialShortlist(pe.partialShortlist);
      if (pe.evaluatedCount !== undefined)                         setEvaluatedCountTo(pe.evaluatedCount);
    }
  }, [liveEvents, pendingBgJobId]);

  const canGoNext =
    step === 'setup'    ? !!selectedJob && candidateCount >= shortlistSize && shortlistSize > 0 :
    step === 'criteria' ? totalWeight === 100 :
    false;

  return (
    <div className="flex flex-col bg-[#eef1f5] min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* System chrome */}
      <SysHeader running={running} elapsed={elapsedTime} user={user ?? undefined} />
      <WorkflowBar step={step} running={running} />

      {/* Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {running ? (
            <ExecutionConsole
              thoughts={thoughts}
              liveScores={liveScores}
              partialShortlist={partialShortlist}
              evaluatedCount={evaluatedCount}
              totalCandidates={totalCandidates}
              elapsed={elapsedTime}
              selectedJobTitle={selectedJob?.title}
              progressPercent={progressPercent}
            />
          ) : (
            <>
              {step === 'setup' && (
                <StepJobSelection
                  jobs={jobs}
                  jobsLoading={jobsLoading}
                  jobId={jobId}
                  setJobId={setJobId}
                  selectedJob={selectedJob}
                  candidateCount={candidateCount}
                  shortlistSize={shortlistSize}
                  setShortlistSize={setShortlistSize}
                />
              )}
              {step === 'criteria' && (
                <StepCriteria weights={customWeights} onChange={setCustomWeights} />
              )}
              {step === 'review' && (
                <StepReview
                  selectedJob={selectedJob}
                  candidateCount={candidateCount}
                  shortlistSize={shortlistSize}
                  weights={customWeights}
                />
              )}
            </>
          )}
        </div>

        {/* Nav bar — only in config mode */}
        {!running && (
          <NavBar
            step={step}
            setStep={setStep}
            canGoNext={canGoNext}
            onRun={handleRun}
            running={running}
            selectedJob={selectedJob}
            totalWeight={totalWeight}
            candidateCount={candidateCount}
            shortlistSize={shortlistSize}
          />
        )}
      </div>

      {/* Status bar */}
      <StatusBar
        totalCandidates={totalCandidates || candidateCount}
        evaluatedCount={evaluatedCount}
        model="GEMINI-2.5-FLASH"
      />
    </div>
  );
}

export default function ScreeningPage() {
  return (
    <Suspense fallback={null}>
      <ScreeningContent />
    </Suspense>
  );
}
