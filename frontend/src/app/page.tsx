'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useJobs } from '@/hooks/useJobs';
import {
  Users, Briefcase, TrendingUp, Target, ArrowRight, Plus,
  Download, RefreshCw, BarChart3, MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// ─── Animation ────────────────────────────────────────────────────────────────
const fade = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, icon: Icon, palette,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  palette: { bg: string; icon: string; border: string };
}) {
  return (
    <motion.div
      variants={fade}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between hover:shadow-md transition-shadow"
    >
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2 leading-none">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${palette.bg} border ${palette.border}`}>
        <Icon className={`w-4 h-4 ${palette.icon}`} strokeWidth={1.75} />
      </div>
    </motion.div>
  );
}

// ─── Pipeline Funnel ──────────────────────────────────────────────────────────
function PipelineFunnel({
  applications, evaluated, shortlisted,
}: {
  applications: number; evaluated: number; shortlisted: number;
}) {
  const stages = [
    { label: 'Applications',  count: applications, color: '#6366f1', light: '#eef2ff' },
    { label: 'Evaluated',     count: evaluated,    color: '#3b82f6', light: '#eff6ff' },
    { label: 'Shortlisted',   count: shortlisted,  color: '#10b981', light: '#ecfdf5' },
  ];
  const max = applications || 1;

  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const pct = Math.round((s.count / max) * 100);
        const conv = i > 0 && stages[i - 1].count > 0
          ? `${Math.round((s.count / stages[i - 1].count) * 100)}% conv.`
          : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                >
                  {i + 1}
                </div>
                <span className="text-xs font-medium text-gray-700">{s.label}</span>
                {conv && (
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {conv}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-gray-900">{s.count.toLocaleString()}</span>
                <span className="text-[11px] text-gray-400">{pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: s.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Quality Distribution (Donut) ────────────────────────────────────────────
const QUALITY_PALETTE = [
  { key: 'Strongly Recommended', label: 'Excellent', color: '#10b981' },
  { key: 'Recommended',          label: 'Good',       color: '#3b82f6' },
  { key: 'Consider',             label: 'Average',    color: '#f59e0b' },
  { key: 'Not Recommended',      label: 'Below Bar',  color: '#f43f5e' },
];

function QualityDonut({ recBD }: { recBD: Record<string, number> }) {
  const data = QUALITY_PALETTE
    .map(p => ({ name: p.label, value: (recBD[p.key] as number) || 0, color: p.color }))
    .filter(d => d.value > 0);

  const total = data.reduce((a, d) => a + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <BarChart3 className="w-8 h-8 text-gray-200 mb-2" />
        <p className="text-xs text-gray-400">No assessment data yet</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        <ResponsiveContainer width={110} height={110}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={50}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '11px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-bold text-gray-900">{total}</span>
          <span className="text-[9px] text-gray-400 font-medium">total</span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {QUALITY_PALETTE.map(p => {
          const count = (recBD[p.key] as number) || 0;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={p.key} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[11px] text-gray-600">{p.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                </div>
                <span className="text-[11px] font-semibold text-gray-700 w-6 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skill Bars ───────────────────────────────────────────────────────────────
function SkillBars({
  skills, color,
}: {
  skills: { skill: string; count: number }[];
  color: string;
}) {
  const max = skills[0]?.count || 1;
  if (skills.length === 0) {
    return (
      <div className="text-center py-6">
        <Target className="w-6 h-6 text-gray-200 mx-auto mb-1.5" />
        <p className="text-xs text-gray-400">No data yet</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {skills.slice(0, 7).map((s, i) => (
        <div key={s.skill} className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-400 w-3 text-right">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-gray-700 truncate pr-2">{s.skill}</span>
              <span className="text-[11px] font-semibold text-gray-900 flex-shrink-0">{s.count}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(s.count / max) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Department Chart ─────────────────────────────────────────────────────────
const DEPT_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

function DepartmentDonut({ jobs }: { jobs: { department?: string }[] }) {
  const deptCount: Record<string, number> = {};
  jobs.forEach(j => {
    const d = j.department || 'Other';
    deptCount[d] = (deptCount[d] || 0) + 1;
  });
  const data = Object.entries(deptCount).map(([name, value]) => ({ name, value }));
  if (data.length === 0) data.push({ name: 'Engineering', value: 1 });

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={38}
          outerRadius={58}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
        <Legend
          formatter={(v) => <span style={{ fontSize: '11px', color: '#6b7280' }}>{v}</span>}
          iconSize={8}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Source Chart ─────────────────────────────────────────────────────────────
function SourceChart({ sources }: { sources: { source: string; count: number }[] }) {
  const data = sources.length > 0 ? sources : [{ source: 'No data', count: 0 }];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="source" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '11px' }} />
        <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Candidates" barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({
  title, action, accent, children, className = '',
}: {
  title: string;
  action?: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={fade}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {accent && (
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
          )}
          <h3 className="text-xs font-semibold text-gray-800">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

// ─── Evaluations Table ────────────────────────────────────────────────────────
function EvaluationsTable({ rows, loading }: {
  rows: { _id?: string; jobTitle: string; totalApplicants: number; shortlistSize: number; screeningDate: string }[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="divide-y divide-gray-50">
        {[1, 2, 3].map(i => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
            <div className="w-6 h-6 bg-gray-100 rounded-md" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 bg-gray-100 rounded w-36" />
            </div>
            <div className="h-2.5 bg-gray-100 rounded w-10" />
            <div className="h-2.5 bg-gray-100 rounded w-8" />
          </div>
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
        </div>
        <p className="text-xs font-semibold text-gray-700 mb-1">No evaluations yet</p>
        <p className="text-[11px] text-gray-400 mb-3">Run your first candidate evaluation to see results here</p>
        <Link
          href="/screening"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3 h-3" /> Start Evaluation
        </Link>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/60">
            <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Position</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Reviewed</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Shortlisted</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rate</th>
            <th className="text-right px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => {
            const rate    = r.totalApplicants > 0 ? Math.round((r.shortlistSize / r.totalApplicants) * 100) : 0;
            const href    = r._id ? `/results/${r._id}` : '/results';
            const rateGood = rate >= 30;
            const rateMid  = rate >= 15;
            return (
              <tr key={r._id || i} className="group hover:bg-indigo-50/40 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-3 h-3 text-indigo-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">
                      {r.jobTitle}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-gray-500">{r.totalApplicants}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-xs font-semibold text-emerald-600">{r.shortlistSize}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      background: rateGood ? '#d1fae5' : rateMid ? '#fef3c7' : '#f3f4f6',
                      color:      rateGood ? '#065f46' : rateMid ? '#92400e' : '#6b7280',
                    }}
                  >
                    {rate}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-[11px] text-gray-400">
                  {new Date(r.screeningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-3 py-2.5">
                  <Link href={href} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Positions Table ──────────────────────────────────────────────────────────
function PositionsTable({ jobs }: { jobs: any[] }) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-xs text-gray-400">No positions created yet</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/60">
            {['Position', 'Department', 'Level', 'Location', 'Type', 'Status', ''].map((h, i) => (
              <th
                key={h + i}
                className={`py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider ${i === 0 || i === 6 ? 'px-4' : 'px-3'} ${i === 0 ? 'text-left' : i === 6 ? 'text-right' : 'text-left'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {jobs.slice(0, 12).map((job: any, i: number) => (
            <tr key={job._id} className="group hover:bg-indigo-50/30 transition-colors">
              <td className="px-4 py-2.5">
                <span className="text-xs font-medium text-gray-800">{job.title}</span>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-[11px] text-gray-500">{job.department || '—'}</span>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-[11px] text-gray-500 capitalize">{job.experienceLevel || '—'}</span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1">
                  {job.location && <MapPin className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />}
                  <span className="text-[11px] text-gray-500">{job.location || '—'}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-[11px] text-gray-500 capitalize">{job.type || job.employmentType || '—'}</span>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: job.isActive ? '#d1fae5' : '#f3f4f6',
                    color:      job.isActive ? '#065f46' : '#6b7280',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: job.isActive ? '#10b981' : '#9ca3af' }}
                  />
                  {job.isActive ? 'Active' : 'Paused'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <Link
                  href="/jobs"
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { dashboard, loading, refreshDashboard } = useDashboard();
  const { jobs } = useJobs();
  const [lastUpdated, setLastUpdated]   = useState(new Date());
  const [refreshing, setRefreshing]     = useState(false);
  const [skillTab, setSkillTab]         = useState<'demand' | 'gaps'>('demand');

  const stats        = dashboard?.overview;
  const scoreStats   = dashboard?.scoreStats;
  const recBD        = (dashboard?.recBreakdown || {}) as Record<string, number>;
  const topSkills    = dashboard?.topSkills    || [];
  const commonGaps   = dashboard?.commonGaps   || [];
  const sources      = dashboard?.candidateSources || [];
  const screenings   = (dashboard?.recentScreenings || []).map(s => ({
    ...s,
    jobTitle:        s.jobTitle        || 'Untitled Position',
    totalApplicants: s.totalApplicants ?? 0,
    shortlistSize:   s.shortlistSize   ?? 0,
    screeningDate:   s.screeningDate   || new Date().toISOString(),
  }));

  const totalShortlisted = screenings.reduce((a, s) => a + s.shortlistSize, 0);
  const totalApplicants  = screenings.reduce((a, s) => a + s.totalApplicants, 0);
  const selectionRate    = totalApplicants > 0
    ? `${((totalShortlisted / totalApplicants) * 100).toFixed(1)}%`
    : '—';

  const skillData = skillTab === 'demand' ? topSkills : commonGaps;

  useEffect(() => { setLastUpdated(new Date()); }, [dashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    refreshDashboard();
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Hiring Overview</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <Download className="w-3 h-3" />
              Export
            </button>
            <Link
              href="/screening"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              New Evaluation
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 max-w-[1600px] mx-auto">

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <KPICard
            label="Open Positions"
            value={stats?.activeJobs ?? 0}
            sub={`${stats?.totalJobs ?? 0} total roles`}
            icon={Briefcase}
            palette={{ bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100' }}
          />
          <KPICard
            label="Candidates in Pipeline"
            value={(stats?.totalCandidates ?? 0).toLocaleString()}
            sub="across all positions"
            icon={Users}
            palette={{ bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' }}
          />
          <KPICard
            label="Selection Rate"
            value={selectionRate}
            sub="shortlisted / reviewed"
            icon={TrendingUp}
            palette={{ bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' }}
          />
          <KPICard
            label="Avg. Quality Score"
            value={scoreStats ? Math.round(scoreStats.avgScore) : '—'}
            sub="candidate fit (out of 100)"
            icon={Target}
            palette={{ bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' }}
          />
        </motion.div>

        {/* ── Row 1: Pipeline + Evaluations Table ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: Pipeline Funnel */}
          <motion.div variants={fade} initial="hidden" animate="show">
            <Card title="Hiring Pipeline" accent="#6366f1">
              <div className="px-4 py-3">
                <PipelineFunnel
                  applications={stats?.totalCandidates ?? 0}
                  evaluated={scoreStats?.totalRanked ?? 0}
                  shortlisted={totalShortlisted}
                />
              </div>

              {/* Summary stats below funnel */}
              <div className="px-4 pb-4 grid grid-cols-3 gap-2 pt-2">
                {[
                  { label: 'Assessments', value: stats?.totalScreenings ?? 0 },
                  { label: 'Shortlisted',  value: totalShortlisted },
                  { label: 'Avg. Score',   value: scoreStats ? Math.round(scoreStats.avgScore) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Right: Recent Evaluations (spans 2 cols) */}
          <motion.div variants={fade} initial="hidden" animate="show" className="lg:col-span-2">
            <Card
              title="Recent Evaluations"
              accent="#3b82f6"
              action={
                <Link
                  href="/results"
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  All results <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <EvaluationsTable rows={screenings} loading={loading} />
            </Card>
          </motion.div>
        </div>

        {/* ── Row 2: Quality Distribution + Skill Intelligence ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Quality Distribution */}
          <motion.div variants={fade} initial="hidden" animate="show">
            <Card title="Candidate Quality" accent="#10b981">
              <div className="px-4 py-3">
                <QualityDonut recBD={recBD} />

                {scoreStats && (
                  <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total Ranked',   value: scoreStats.totalRanked ?? 0 },
                      { label: 'Highest Score',  value: scoreStats.maxScore ? Math.round(scoreStats.maxScore) : '—' },
                      { label: 'Selection Rate', value: selectionRate },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <p className="text-sm font-bold text-gray-900">{value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Skill Intelligence */}
          <motion.div variants={fade} initial="hidden" animate="show">
            <Card
              title="Skill Intelligence"
              accent={skillTab === 'demand' ? '#6366f1' : '#f59e0b'}
              action={
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden">
                  {([
                    { key: 'demand', label: 'In Demand' },
                    { key: 'gaps',   label: 'Gaps'       },
                  ] as const).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setSkillTab(t.key)}
                      className="px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={{
                        background: skillTab === t.key ? '#4f46e5' : 'transparent',
                        color:      skillTab === t.key ? '#fff'     : '#9ca3af',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="px-4 py-3">
                <SkillBars
                  skills={skillData}
                  color={skillTab === 'demand' ? '#6366f1' : '#f59e0b'}
                />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* ── Row 3: Dept + Sources ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Department Breakdown */}
          <motion.div variants={fade} initial="hidden" animate="show">
            <Card title="By Department" accent="#8b5cf6">
              <div className="px-4 py-3">
                <DepartmentDonut jobs={jobs} />
              </div>
            </Card>
          </motion.div>

          {/* Candidate Sources */}
          <motion.div variants={fade} initial="hidden" animate="show">
            <Card title="Candidate Sources" accent="#f59e0b">
              <div className="px-4 py-3">
                {sources.length > 0 ? (
                  <SourceChart sources={sources} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <BarChart3 className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No source data yet</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* ── Row 4: All Positions Table ────────────────────────────────────── */}
        <motion.div variants={fade} initial="hidden" animate="show">
          <Card
            title="All Positions"
            accent="#3b82f6"
            action={
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{jobs.length} roles</span>
                <Link
                  href="/jobs"
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            }
          >
            <PositionsTable jobs={jobs} />
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
