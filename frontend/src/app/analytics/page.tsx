'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Users, Briefcase, Target, UserCheck,
  Activity, RefreshCw, BarChart3, CheckCircle2, AlertTriangle,
  Star, Trophy, FileText, ChevronRight, Database, Server, Brain,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useDashboard } from '@/hooks/useDashboard';
import { useJobs } from '@/hooks/useJobs';
import Link from 'next/link';

// ─── System Header ──────────────────────────────────────────────────────────────
function SysHeader({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const [clock, setClock] = useState(() => {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}:${n.getSeconds().toString().padStart(2, '0')} UTC`;
  });
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setClock(`${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}:${n.getSeconds().toString().padStart(2, '0')} UTC`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-9 bg-white border-b border-gray-200 flex items-center px-4 gap-0 flex-shrink-0 select-none">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[11px] font-bold text-gray-900 tracking-widest uppercase">TalentAI</span>
        </div>
        <div className="w-px h-3.5 bg-gray-200" />
        <span className="text-[10px] text-gray-500 tracking-wider uppercase">People Analytics · Executive Dashboard</span>
        <div className="w-px h-3.5 bg-gray-200" />
        <span className="text-[10px] text-gray-400 font-mono">STRATEGIC HIRING INTELLIGENCE</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-gray-400">{clock}</span>
        <div className="w-px h-3.5 bg-gray-200" />
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? 'animate-spin' : ''}`} />
          REFRESH
        </button>
      </div>
    </div>
  );
}

// ─── KPI Strip ──────────────────────────────────────────────────────────────────
function KPIStrip({ metrics }: {
  metrics: { label: string; value: string | number; unit?: string; accent: string; icon: React.ElementType }[];
}) {
  return (
    <div className="bg-white border-b border-gray-200 flex items-stretch flex-shrink-0">
      {metrics.map(({ label, value, unit = '', accent, icon: Icon }, i) => (
        <React.Fragment key={label}>
          {i > 0 && <div className="w-px bg-gray-200 self-stretch" />}
          <div className="flex-1 px-4 py-2.5 flex items-center gap-2.5 min-w-0">
            <Icon className="w-3 h-3 flex-shrink-0" style={{ color: accent }} />
            <div className="min-w-0">
              <p className="text-[8px] font-semibold uppercase tracking-widest text-gray-500 leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold font-mono leading-none" style={{ color: accent }}>
                {value}{unit}
              </p>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────────────────
function Panel({ title, badge, action, children, accent = '#3b82f6' }: {
  title: string; badge?: string; action?: React.ReactNode;
  children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-3.5 rounded-sm" style={{ backgroundColor: accent }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">{title}</span>
          {badge && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-500">{badge}</span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Chart Tooltip ──────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow px-3 py-2 text-[11px] font-mono">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Empty Cell ─────────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-center">
      <div>
        <Icon className="w-7 h-7 text-gray-200 mx-auto mb-2" />
        <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { dashboard, loading, refreshDashboard } = useDashboard();
  const { jobs } = useJobs();
  const [refreshing, setRefreshing]   = useState(false);
  const [skillTab, setSkillTab]       = useState<'demand' | 'gaps'>('demand');

  const stats      = dashboard?.overview;
  const scoreStats = dashboard?.scoreStats;
  const topSkills  = dashboard?.topSkills  || [];
  const commonGaps = dashboard?.commonGaps || [];
  const recBD      = dashboard?.recBreakdown || {};

  const recentScreenings = (dashboard?.recentScreenings || []).map(s => ({
    jobTitle:        s.jobTitle        || 'Unknown Position',
    totalApplicants: s.totalApplicants ?? 0,
    shortlistSize:   s.shortlistSize   ?? 0,
    screeningDate:   s.screeningDate   || new Date().toISOString(),
    aiModel:         s.aiModel         || 'GEMINI',
  }));

  const totalApplicants  = recentScreenings.reduce((a, s) => a + s.totalApplicants, 0);
  const totalShortlisted = recentScreenings.reduce((a, s) => a + s.shortlistSize, 0);
  const convRate  = totalApplicants > 0 ? ((totalShortlisted / totalApplicants) * 100).toFixed(1) : '—';
  const totalRecs = Object.values(recBD).reduce<number>((a, b) => a + (b as number), 0);

  const scoreDistData = useMemo(() => [
    { label: 'STRONG',   range: '80–100', count: recBD['Strongly Recommended'] || 0, color: '#16a34a' },
    { label: 'REC.',     range: '65–79',  count: recBD['Recommended']           || 0, color: '#3b82f6' },
    { label: 'CONSIDER', range: '50–64',  count: recBD['Consider']              || 0, color: '#d97706' },
    { label: 'NOT REC.', range: '0–49',   count: recBD['Not Recommended']       || 0, color: '#ef4444' },
  ], [recBD]);

  const handleRefresh = () => {
    setRefreshing(true);
    refreshDashboard();
    setTimeout(() => setRefreshing(false), 1200);
  };

  const kpis = [
    { label: 'CANDIDATE POOL',    value: stats?.totalCandidates ?? 0,                                        icon: Users,      accent: '#3b82f6' },
    { label: 'ACTIVE POSITIONS',  value: stats?.activeJobs ?? 0,                                             icon: Briefcase,  accent: '#7c3aed' },
    { label: 'EVALUATIONS RUN',   value: stats?.totalScreenings ?? 0,                                        icon: FileText,   accent: '#16a34a' },
    { label: 'AVG QUALITY SCORE', value: scoreStats ? Math.round(scoreStats.avgScore) : '—', unit: scoreStats ? '%' : '', icon: Target,     accent: '#d97706' },
    { label: 'SHORTLISTED',       value: totalShortlisted,                                                    icon: UserCheck,  accent: '#16a34a' },
    { label: 'SELECTION RATE',    value: convRate, unit: convRate !== '—' ? '%' : '',                        icon: TrendingUp, accent: '#3b82f6' },
  ];

  const REC_ROWS = [
    { key: 'Strongly Recommended', label: 'STRONGLY REC.', color: '#16a34a', icon: Star },
    { key: 'Recommended',          label: 'RECOMMENDED',   color: '#3b82f6', icon: CheckCircle2 },
    { key: 'Consider',             label: 'CONSIDER',      color: '#d97706', icon: AlertTriangle },
    { key: 'Not Recommended',      label: 'NOT REC.',      color: '#ef4444', icon: TrendingDown },
  ];

  const skillData = skillTab === 'demand' ? topSkills : commonGaps;
  const skillMax  = skillData[0]?.count || 1;
  const skillColor = skillTab === 'demand' ? '#3b82f6' : '#d97706';

  return (
    <div className="min-h-screen bg-[#eef1f5] font-sans flex flex-col">

      <SysHeader onRefresh={handleRefresh} refreshing={refreshing} />
      <KPIStrip metrics={kpis} />

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-4">

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">LOADING ANALYTICS...</p>
              </div>
            </div>
          ) : (
            <>

              {/* ── Row 1: Recent Evaluations + Assessment Outcomes ── */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

                {/* Recent Evaluations table */}
                <Panel
                  title="RECENT EVALUATIONS"
                  badge={`${recentScreenings.length} SESSIONS`}
                  action={
                    <Link href="/results" className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">
                      ALL RESULTS <ChevronRight className="w-3 h-3" />
                    </Link>
                  }
                >
                  {recentScreenings.length === 0 ? (
                    <EmptyState icon={FileText} label="NO EVALUATIONS YET" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                            {[
                              { h: 'POSITION',    align: 'left'  },
                              { h: 'APPLICANTS',  align: 'right' },
                              { h: 'SHORTLISTED', align: 'right' },
                              { h: 'RATE',        align: 'right' },
                              { h: 'ENGINE',      align: 'right' },
                              { h: 'DATE',        align: 'right' },
                            ].map(({ h, align }) => (
                              <th
                                key={h}
                                className="py-2.5 px-4 text-[9px] font-bold uppercase tracking-widest text-gray-500 font-mono"
                                style={{ textAlign: align as 'left' | 'right' }}
                              >{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {recentScreenings.map((s, i) => {
                            const rate    = s.totalApplicants > 0 ? ((s.shortlistSize / s.totalApplicants) * 100).toFixed(0) : '0';
                            const rateNum = Number(rate);
                            return (
                              <tr
                                key={i}
                                style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}
                                className="hover:bg-blue-50 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 flex-shrink-0" />
                                    <span className="text-xs font-bold font-mono text-gray-900">{s.jobTitle}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-xs font-mono text-gray-600">{s.totalApplicants}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-xs font-bold font-mono" style={{ color: '#16a34a' }}>{s.shortlistSize}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span
                                    className="text-[10px] font-bold font-mono px-2 py-0.5"
                                    style={{
                                      background: rateNum >= 30 ? '#dcfce7' : rateNum >= 15 ? '#fef3c7' : '#f3f4f6',
                                      color:      rateNum >= 30 ? '#16a34a' : rateNum >= 15 ? '#d97706'  : '#6b7280',
                                      border:     `1px solid ${rateNum >= 30 ? '#bbf7d0' : rateNum >= 15 ? '#fde68a' : '#e5e7eb'}`,
                                    }}
                                  >
                                    {rate}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-[9px] font-mono text-gray-400 uppercase">{s.aiModel}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-[10px] font-mono text-gray-500">
                                    {new Date(s.screeningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>

                {/* Assessment Outcomes */}
                <Panel title="ASSESSMENT OUTCOMES" badge={`${totalRecs} TOTAL`}>
                  {totalRecs === 0 ? (
                    <EmptyState icon={Trophy} label="NO DATA YET" />
                  ) : (
                    <div className="p-4 space-y-3">
                      {REC_ROWS.map(({ key, label, color, icon: Icon }) => {
                        const count = (recBD[key] as number) || 0;
                        const pct   = totalRecs > 0 ? Math.round((count / totalRecs) * 100) : 0;
                        return (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                                <span className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color }}>{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold font-mono text-gray-700">{count}</span>
                                <span className="text-[9px] font-mono text-gray-400 w-6 text-right">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 border border-gray-200 overflow-hidden">
                              <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-3 border-t border-gray-200 space-y-0">
                        {[
                          { label: 'TOTAL RANKED',    value: scoreStats?.totalRanked ?? 0,                                                    color: '#3b82f6' },
                          { label: 'AVG CONFIDENCE',  value: scoreStats?.avgConfidence ? `${Math.round(scoreStats.avgConfidence)}%` : '—',    color: '#6b7280' },
                          { label: 'HIGHEST SCORE',   value: scoreStats?.maxScore ? `${Math.round(scoreStats.maxScore)}` : '—',               color: '#16a34a' },
                          { label: 'SELECTION RATE',  value: convRate !== '—' ? `${convRate}%` : '—',                                         color: '#3b82f6' },
                        ].map(({ label, value, color }, i, arr) => (
                          <div
                            key={label}
                            className="flex items-center justify-between py-2"
                            style={{ borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                          >
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{label}</span>
                            <span className="text-[11px] font-bold font-mono" style={{ color }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Panel>
              </div>

              {/* ── Row 2: Score Chart + Skill Intelligence + Pipeline Summary ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Score Distribution */}
                <Panel title="SCORE DISTRIBUTION" badge="BY QUALITY BAND">
                  <div className="p-4">
                    {totalRecs === 0 ? (
                      <EmptyState icon={BarChart3} label="NO EVALUATION DATA YET" />
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={scoreDistData} barSize={44} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'monospace', fontWeight: 700 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'monospace' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="count" name="Candidates" radius={[2, 2, 0, 0]}>
                              {scoreDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-gray-100">
                          {scoreDistData.map(d => (
                            <div key={d.range} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: d.color }} />
                              <span className="text-[9px] font-mono text-gray-500">{d.range}</span>
                              <span className="text-[9px] font-bold font-mono text-gray-700 ml-auto">{d.count}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Panel>

                {/* Skill Intelligence */}
                <Panel
                  title="SKILL INTELLIGENCE"
                  accent={skillColor}
                  action={
                    <div className="flex items-center gap-px border border-gray-200">
                      {(['demand', 'gaps'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setSkillTab(t)}
                          className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
                          style={{
                            background: skillTab === t ? '#3b82f6' : 'transparent',
                            color:      skillTab === t ? '#fff'    : '#9ca3af',
                          }}
                        >
                          {t === 'demand' ? 'DEMAND' : 'GAPS'}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <div className="p-4 space-y-2.5">
                    {skillData.length === 0 ? (
                      <EmptyState icon={Target} label="NO SKILL DATA YET" />
                    ) : (
                      skillData.slice(0, 8).map((s: { skill: string; count: number }) => {
                        const pct = Math.min(100, (s.count / skillMax) * 100);
                        return (
                          <div key={s.skill} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-gray-700 truncate pr-2">{s.skill}</span>
                              <span className="text-[10px] font-bold font-mono text-gray-900 flex-shrink-0">{s.count}</span>
                            </div>
                            <div className="h-1 bg-gray-100 overflow-hidden">
                              <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: skillColor }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Panel>

                {/* Pipeline Summary + Quick Actions */}
                <div className="space-y-4">
                  <Panel title="PIPELINE SUMMARY">
                    <div className="p-4 space-y-0">
                      {[
                        { label: 'TOTAL CANDIDATES', value: stats?.totalCandidates ?? 0,  color: '#3b82f6' },
                        { label: 'ACTIVE ROLES',      value: stats?.activeJobs ?? 0,       color: '#7c3aed' },
                        { label: 'TOTAL ROLES',       value: stats?.totalJobs ?? 0,        color: '#6b7280' },
                        { label: 'SCREENINGS DONE',   value: stats?.totalScreenings ?? 0, color: '#16a34a' },
                        { label: 'CANDIDATES RANKED', value: scoreStats?.totalRanked ?? 0, color: '#d97706' },
                      ].map(({ label, value, color }, i, arr) => (
                        <div
                          key={label}
                          className="flex items-center justify-between py-2"
                          style={{ borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                        >
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{label}</span>
                          <span className="text-[11px] font-bold font-mono" style={{ color }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="QUICK ACTIONS">
                    <div className="p-3 space-y-1.5">
                      {[
                        { label: 'RUN EVALUATION',  sub: 'Screen new candidates',  href: '/screening', color: '#3b82f6' },
                        { label: 'VIEW RESULTS',     sub: 'All screening outcomes', href: '/results',   color: '#7c3aed' },
                        { label: 'MANAGE POSITIONS', sub: 'Jobs & descriptions',    href: '/jobs',      color: '#16a34a' },
                      ].map(item => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center justify-between px-3 py-2.5 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                        >
                          <div>
                            <p className="text-[10px] font-bold font-mono uppercase tracking-wider" style={{ color: item.color }}>{item.label}</p>
                            <p className="text-[9px] font-mono text-gray-400 mt-0.5">{item.sub}</p>
                          </div>
                          <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </Link>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>

              {/* ── Row 3: Position Overview ── */}
              <Panel
                title="POSITION OVERVIEW"
                badge={`${jobs.length} ROLES`}
                action={
                  <Link href="/jobs" className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">
                    MANAGE <ChevronRight className="w-3 h-3" />
                  </Link>
                }
              >
                {jobs.length === 0 ? (
                  <EmptyState icon={Briefcase} label="NO POSITIONS FOUND" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                          {[
                            { h: 'POSITION',   align: 'left'  },
                            { h: 'DEPARTMENT', align: 'left'  },
                            { h: 'LEVEL',      align: 'left'  },
                            { h: 'TYPE',       align: 'left'  },
                            { h: 'STATUS',     align: 'left'  },
                            { h: '',           align: 'right' },
                          ].map(({ h, align }, i) => (
                            <th
                              key={h + i}
                              className="py-2.5 px-4 text-[9px] font-bold uppercase tracking-widest text-gray-500 font-mono"
                              style={{ textAlign: align as 'left' | 'right' }}
                            >{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.slice(0, 10).map((job: any, i: number) => (
                          <tr
                            key={job._id}
                            style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}
                            className="hover:bg-blue-50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <span className="text-xs font-bold font-mono text-gray-900">{job.title}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-mono text-gray-500">{job.department || '—'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-mono text-gray-500 uppercase">{job.experienceLevel || '—'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-mono text-gray-500 uppercase">{job.employmentType || '—'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className="text-[9px] font-bold font-mono px-2 py-0.5"
                                style={{
                                  background: job.isActive ? '#dcfce7' : '#f3f4f6',
                                  color:      job.isActive ? '#16a34a' : '#6b7280',
                                  border:     `1px solid ${job.isActive ? '#bbf7d0' : '#e5e7eb'}`,
                                }}
                              >
                                {job.isActive ? 'ACTIVE' : 'PAUSED'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                href="/jobs"
                                className="text-[10px] font-bold font-mono text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                              >
                                OPEN →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

            </>
          )}
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="h-7 bg-white border-t border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 select-none">
        {[
          { icon: Database,  label: 'CANDIDATES', value: `${stats?.totalCandidates ?? 0}`  },
          { icon: Briefcase, label: 'POSITIONS',  value: `${stats?.activeJobs ?? 0} ACTIVE / ${stats?.totalJobs ?? 0} TOTAL` },
          { icon: Activity,  label: 'RATE',       value: convRate !== '—' ? `${convRate}%` : '—' },
          { icon: Server,    label: 'ENGINE',     value: 'GEMINI 2.5 FLASH' },
          { icon: Brain,     label: 'STATUS',     value: loading ? 'LOADING...' : 'OPERATIONAL' },
        ].map(({ icon: Icon, label, value }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="w-px h-3 bg-gray-200" />}
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <Icon className="w-2.5 h-2.5 text-gray-400" />
              <span className="text-gray-400 tracking-wider">{label}:</span>
              <span className="text-gray-500 tracking-wider">{value}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

    </div>
  );
}
