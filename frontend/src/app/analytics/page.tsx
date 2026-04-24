'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Users, Briefcase, Target, UserCheck,
  Activity, Clock, RefreshCw, ArrowUpRight, BarChart3, Download,
  CheckCircle2, AlertTriangle, Star, Trophy, Zap, FileText,
  ChevronRight, MapPin, Building2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { useDashboard } from '@/hooks/useDashboard';
import { useJobs } from '@/hooks/useJobs';
import Link from 'next/link';

// ─── Palette ───────────────────────────────────────────────────────────────────
const COLORS = {
  blue:   '#2563eb',
  green:  '#059669',
  amber:  '#d97706',
  red:    '#dc2626',
  violet: '#7c3aed',
  gray:   '#6b7280',
};
const CHART_COLORS = [COLORS.blue, COLORS.violet, COLORS.green, COLORS.amber, COLORS.red];

// ─── Animation ─────────────────────────────────────────────────────────────────
const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

// ─── Sub-components ────────────────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return (
    <span className="font-mono text-[11px] text-gray-400">
      {t.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
      {' · '}
      {t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

function KPI({
  label, value, sub, icon: Icon, accent = COLORS.blue, trend, trendLabel,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent?: string;
  trend?: 'up' | 'down' | 'flat'; trendLabel?: string;
}) {
  const TIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  const tColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-gray-400';
  return (
    <motion.div variants={fade} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900 tracking-tight leading-none">{value}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
      </div>
      {trend && trendLabel && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${tColor}`}>
          {TIcon && <TIcon className="w-3 h-3" />}
          {trendLabel}
        </div>
      )}
    </motion.div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, action, children, className = '' }: {
  title: string; subtitle?: string; icon?: React.ElementType;
  action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.div variants={fade} className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5 text-gray-600" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-700 font-medium truncate pr-2">{label}</span>
        <span className="text-xs font-bold text-gray-900 flex-shrink-0">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const REC_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  'Strongly Recommended': { label: 'Strongly Recommended', color: COLORS.green,  icon: Star },
  'Recommended':          { label: 'Recommended',          color: COLORS.blue,   icon: CheckCircle2 },
  'Consider':             { label: 'Consider',             color: COLORS.amber,  icon: AlertTriangle },
  'Not Recommended':      { label: 'Not Recommended',      color: COLORS.gray,   icon: TrendingDown },
};

// ─── Custom Tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { dashboard, loading, refreshDashboard } = useDashboard();
  const { jobs } = useJobs();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeSkillTab, setActiveSkillTab] = useState<'demand' | 'gaps'>('demand');

  const stats     = dashboard?.overview;
  const scoreStats = dashboard?.scoreStats;
  const topSkills  = dashboard?.topSkills  || [];
  const commonGaps = dashboard?.commonGaps || [];
  const recBD      = dashboard?.recBreakdown || {};
  const sources    = dashboard?.candidateSources || [];
  const recentScreenings = (dashboard?.recentScreenings || []).map(s => ({
    jobTitle:        s.jobTitle        || 'Unknown Position',
    totalApplicants: s.totalApplicants ?? 0,
    shortlistSize:   s.shortlistSize   ?? 0,
    screeningDate:   s.screeningDate   || new Date().toISOString(),
    aiModel:         s.aiModel         || '',
  }));

  const totalApplicants  = recentScreenings.reduce((a, s) => a + s.totalApplicants, 0);
  const totalShortlisted = recentScreenings.reduce((a, s) => a + s.shortlistSize, 0);
  const convRate = totalApplicants > 0 ? ((totalShortlisted / totalApplicants) * 100).toFixed(1) : '0';

  const totalRecs = Object.values(recBD).reduce((a, b) => a + b, 0);

  // Score distribution derived from recBreakdown as proxy buckets
  const scoreDistData = useMemo(() => [
    { range: '80–100', count: (recBD['Strongly Recommended'] || 0) },
    { range: '65–79',  count: (recBD['Recommended'] || 0) },
    { range: '50–64',  count: (recBD['Consider'] || 0) },
    { range: '0–49',   count: (recBD['Not Recommended'] || 0) },
  ], [recBD]);

  const pieData = useMemo(() => sources.map((s, i) => ({
    name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    value: s.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })), [sources]);

  const handleRefresh = () => {
    setRefreshing(true);
    refreshDashboard();
    setTimeout(() => { setLastRefresh(new Date()); setRefreshing(false); }, 1200);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="min-h-screen bg-gray-50">

      {/* ── Status Bar ── */}
      <div className="bg-gray-900 px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">TalentAI</span>
          </div>
          <span className="text-gray-600 text-[10px]">|</span>
          <span className="text-[10px] text-gray-400 tracking-wider uppercase">People Analytics · Executive View</span>
        </div>
        <div className="flex items-center gap-4">
          <LiveClock />
          <span className="text-[10px] text-gray-500">
            Refreshed: <span className="text-gray-300">{lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      </div>

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">People Analytics</h1>
            <p className="text-xs text-gray-500 mt-0.5">Strategic hiring intelligence for leadership decisions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all">
              <Download className="w-3.5 h-3.5" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4 border-[3px]" />
              <p className="text-sm text-gray-500">Loading analytics…</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── KPI Row ── */}
            <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPI label="Candidate Pool"    value={stats?.totalCandidates ?? 0} sub="total in pipeline"          icon={Users}     accent={COLORS.blue}   trend="up"   trendLabel="Active pipeline" />
              <KPI label="Open Positions"    value={stats?.activeJobs ?? 0}      sub={`of ${stats?.totalJobs ?? 0} total`} icon={Briefcase} accent={COLORS.violet} />
              <KPI label="Evaluations Run"   value={stats?.totalScreenings ?? 0} sub="completed sessions"        icon={FileText}  accent={COLORS.green}  />
              <KPI label="Average Score"     value={scoreStats ? Math.round(scoreStats.avgScore) : '—'}  sub="composite /100" icon={Target}    accent={COLORS.amber}  />
              <KPI label="Shortlisted"       value={totalRecs}                   sub="across all roles"          icon={UserCheck} accent={COLORS.green}  trend="up"   trendLabel={`${convRate}% selection rate`} />
              <KPI label="Top Score"         value={scoreStats ? Math.round(scoreStats.maxScore) : '—'}   sub="highest candidate"      icon={Trophy}    accent={COLORS.blue}   />
            </motion.div>

            {/* ── Executive Summary Banner ── */}
            <motion.div variants={fade} className="rounded-xl bg-gray-900 text-white p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">Executive Summary</h2>
                  <p className="text-[10px] text-gray-400">Key hiring indicators at a glance</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Pipeline Health',
                    value: `${stats?.totalCandidates ?? 0} candidates`,
                    sub: `across ${stats?.activeJobs ?? 0} active positions`,
                    color: 'border-blue-500/40 bg-blue-500/10',
                    icon: Users,
                  },
                  {
                    label: 'Evaluation Coverage',
                    value: `${stats?.totalScreenings ?? 0} sessions`,
                    sub: `${scoreStats?.totalRanked ?? 0} candidates ranked`,
                    color: 'border-violet-500/40 bg-violet-500/10',
                    icon: FileText,
                  },
                  {
                    label: 'Selection Rate',
                    value: `${convRate}%`,
                    sub: `${totalShortlisted} of ${totalApplicants} applicants`,
                    color: 'border-emerald-500/40 bg-emerald-500/10',
                    icon: UserCheck,
                  },
                  {
                    label: 'Quality Index',
                    value: scoreStats ? `${Math.round(scoreStats.avgScore)}/100` : '—',
                    sub: `avg confidence ${scoreStats?.avgConfidence ? Math.round(scoreStats.avgConfidence) : '—'}%`,
                    color: 'border-amber-500/40 bg-amber-500/10',
                    icon: Target,
                  },
                ].map(item => (
                  <div key={item.label} className={`border rounded-lg p-3.5 ${item.color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-lg font-bold text-white">{item.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── Row 1: Evaluations + Candidate Sources ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Recent Evaluations Table */}
              <SectionCard
                className="lg:col-span-2"
                title="Recent Evaluations"
                subtitle="Latest candidate assessment sessions"
                icon={Activity}
                action={
                  <Link href="/results" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                }
              >
                {recentScreenings.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No evaluations yet</p>
                      <p className="text-xs text-gray-300 mt-1">Run your first screening to see results here</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-left">Position</th>
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-right">Applicants</th>
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-right">Shortlisted</th>
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-right">Rate</th>
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recentScreenings.map((s, i) => {
                          const rate = s.totalApplicants > 0 ? ((s.shortlistSize / s.totalApplicants) * 100).toFixed(0) : '0';
                          return (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <span className="text-sm font-semibold text-gray-900">{s.jobTitle}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-sm text-gray-600">{s.totalApplicants}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-sm font-bold text-emerald-600">{s.shortlistSize}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  Number(rate) >= 30 ? 'bg-emerald-50 text-emerald-700' :
                                  Number(rate) >= 15 ? 'bg-amber-50 text-amber-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{rate}%</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-xs text-gray-400">
                                  {new Date(s.screeningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              {/* Candidate Sources */}
              <SectionCard title="Candidate Sources" subtitle="Intake channel breakdown" icon={Users}>
                {sources.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-center">
                    <div>
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No source data yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 space-y-1">
                    {/* Mini donut */}
                    {pieData.length > 0 && (
                      <div className="flex justify-center mb-4">
                        <ResponsiveContainer width={120} height={120}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                              dataKey="value" paddingAngle={2} strokeWidth={0}>
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="space-y-3">
                      {sources.map((src, i) => (
                        <div key={src.source} className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700 capitalize">{src.source}</span>
                              <span className="text-xs font-bold text-gray-900">{src.count}</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (src.count / (sources[0]?.count || 1)) * 100)}%`,
                                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* ── Row 2: Score Distribution + Recommendation Breakdown ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Score Distribution */}
              <SectionCard title="Score Distribution" subtitle="Candidate quality across all evaluations" icon={BarChart3}>
                <div className="p-5">
                  {totalRecs === 0 ? (
                    <div className="flex items-center justify-center py-10 text-center">
                      <div>
                        <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No evaluation data yet</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={scoreDistData} barSize={36}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                          {scoreDistData.map((entry, i) => (
                            <Cell key={i} fill={[COLORS.green, COLORS.blue, COLORS.amber, COLORS.gray][i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </SectionCard>

              {/* Recommendation Breakdown */}
              <SectionCard title="Assessment Outcomes" subtitle="Candidate recommendation summary" icon={Trophy}>
                <div className="p-5 space-y-3">
                  {totalRecs === 0 ? (
                    <div className="flex items-center justify-center py-10 text-center">
                      <div>
                        <Trophy className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No assessment data yet</p>
                      </div>
                    </div>
                  ) : (
                    Object.entries(REC_CONFIG).map(([key, cfg]) => {
                      const count = recBD[key] || 0;
                      const pct = totalRecs > 0 ? Math.round((count / totalRecs) * 100) : 0;
                      const IconComp = cfg.icon;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <IconComp className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">{cfg.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-900">{count}</span>
                                <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </SectionCard>
            </div>

            {/* ── Row 3: Skill Intelligence ── */}
            <SectionCard
              title="Skill Intelligence"
              subtitle="Market demand vs. candidate supply analysis"
              icon={Target}
              action={
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {(['demand', 'gaps'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveSkillTab(tab)}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                        activeSkillTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab === 'demand' ? 'In-Demand Skills' : 'Skill Gaps'}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="p-5">
                {activeSkillTab === 'demand' ? (
                  topSkills.length === 0 ? (
                    <div className="text-center py-10">
                      <Target className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No skill data available yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {topSkills.slice(0, 10).map((s, i) => (
                        <ScoreBar key={s.skill} label={s.skill} value={s.count} max={topSkills[0]?.count || 1} color={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </div>
                  )
                ) : (
                  commonGaps.length === 0 ? (
                    <div className="text-center py-10">
                      <AlertTriangle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No gap data available yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {commonGaps.slice(0, 10).map((g, i) => (
                        <ScoreBar key={g.skill} label={g.skill} value={g.count} max={commonGaps[0]?.count || 1} color={COLORS.amber} />
                      ))}
                    </div>
                  )
                )}
              </div>
            </SectionCard>

            {/* ── Row 4: Positions + Quick Actions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Open Positions */}
              <SectionCard
                className="lg:col-span-2"
                title="Position Overview"
                subtitle="Active roles in the hiring pipeline"
                icon={Briefcase}
                action={
                  <Link href="/jobs" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                    Manage <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                }
              >
                {jobs.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No positions found</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-left">Position</th>
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-left">Department</th>
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-left">Level</th>
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-center">Status</th>
                          <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {jobs.slice(0, 8).map((job: any) => (
                          <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Briefcase className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{job.title}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs text-gray-500">{job.department || '—'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs text-gray-500">{job.experienceLevel}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                job.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {job.isActive ? 'Active' : 'Paused'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                href="/jobs"
                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center justify-end gap-0.5"
                              >
                                Open <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              {/* Quick Actions */}
              <SectionCard title="Quick Actions" subtitle="Frequently used workflows" icon={Zap}>
                <div className="p-4 space-y-2">
                  {[
                    { label: 'Run Evaluation',   sub: 'Assess new candidates',          href: '/screening', icon: Zap,       color: 'bg-blue-50 text-blue-600 border-blue-100' },
                    { label: 'View Results',      sub: 'Review evaluation outcomes',     href: '/results',   icon: Trophy,    color: 'bg-violet-50 text-violet-600 border-violet-100' },
                    { label: 'Manage Positions',  sub: `${stats?.activeJobs ?? 0} open`, href: '/jobs',      icon: Briefcase, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                  ].map(item => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 p-3 rounded-xl border hover:shadow-sm transition-all group"
                      style={{ borderColor: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '')}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${item.color}`}>
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                        <p className="text-[10px] text-gray-400">{item.sub}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </Link>
                  ))}

                  {/* System Health */}
                  <div className="mt-2 pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">System Status</p>
                    {[
                      { label: 'Data Pipeline',     status: 'Operational', ok: true },
                      { label: 'Evaluation Engine', status: 'Operational', ok: true },
                      { label: 'Notifications',     status: 'Active',      ok: true },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">{item.label}</span>
                        <span className={`flex items-center gap-1 text-[10px] font-semibold ${item.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="mt-6 px-6 py-3 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between text-[10px] text-gray-400 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-500">TalentAI</span>
            <span>People Analytics Platform</span>
            <span>·</span>
            <span>Confidential — For Internal Use Only</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
