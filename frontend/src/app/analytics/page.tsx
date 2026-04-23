'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Users, Briefcase, Target,
  Download, UserCheck, Activity, Clock,
  RefreshCw, ArrowUpRight,
  BarChart3, PieChart as PieChartIcon,
  CheckCircle2, AlertTriangle,
  Star, Trophy, Zap, Lightbulb, FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ComposedChart,
} from 'recharts';
import { useDashboard } from '@/hooks/useDashboard';
import { useJobs } from '@/hooks/useJobs';
import Link from 'next/link';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y';

// ─── Colors matching evaluation criteria from screening page ────────────────────
const criteriaColors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777'];

// ─── Animation Variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Components ────────────────────────────────────────────────────────────────

function SystemHeader({ lastUpdated }: { lastUpdated: Date }) {
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-blue-600 px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-white tracking-widest uppercase">TalentHub Analytics</span>
        </div>
        <div className="w-px h-4 bg-blue-400" />
        <span className="text-[9px] text-blue-200 tracking-wider uppercase">Executive Dashboard</span>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-mono text-blue-200">
        <span>UPDATED: <span className="text-white">{lastUpdated.toLocaleTimeString()}</span></span>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/30 rounded">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>ONLINE</span>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  trendValue,
  delay,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  delay: number;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 tracking-tight">{value}</span>
            {subValue && <span className="text-xs text-gray-400">{subValue}</span>}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-gray-500'
        }`}>
          {TrendIcon && <TrendIcon className="w-3.5 h-3.5" />}
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Chart Components ──────────────────────────────────────────────────────────

function SkillGapChart({ skills, gaps }: { skills: { skill: string; count: number; avgScore: number }[]; gaps: { skill: string; missingCount: number }[] }) {
  const combinedData = useMemo(() => {
    const data = skills.slice(0, 6).map((s, i) => ({
      skill: s.skill,
      demand: Math.min(100, s.count * 5 + 40),
      supply: Math.min(100, Math.max(20, s.avgScore)),
      gap: gaps.find(g => g.skill === s.skill) ? -Math.min(30, gaps.find(g => g.skill === s.skill)!.missingCount * 3) : 10,
      color: criteriaColors[i % criteriaColors.length],
    }));
    return data;
  }, [skills, gaps]);

  if (combinedData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No skill data available</p>
          <p className="text-xs text-gray-400 mt-1">Run screenings to see skill analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {combinedData.map((item) => (
        <div key={item.skill} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-700">{item.skill}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              item.gap < -20 ? 'bg-rose-50 text-rose-600' :
              item.gap < -10 ? 'bg-amber-50 text-amber-600' :
              'bg-gray-50 text-gray-600'
            }`}>
              {item.gap > 0 ? '+' : ''}{item.gap}%
            </span>
          </div>
          <div className="relative h-3 bg-gray-100 rounded overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded transition-all duration-500"
              style={{ width: `${item.demand}%`, backgroundColor: item.color }}
            />
            <div
              className="absolute left-0 top-0 h-full rounded transition-all duration-500 opacity-60"
              style={{ width: `${item.supply}%`, backgroundColor: criteriaColors[(criteriaColors.indexOf(item.color) + 2) % criteriaColors.length] }}
            />
          </div>
          <div className="flex items-center justify-between text-[8px] text-gray-400">
            <span>D: {item.demand}%</span>
            <span>S: {item.supply}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationChart({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No screening data available</p>
          <p className="text-xs text-gray-400 mt-1">Run screenings to see recommendations</p>
        </div>
      </div>
    );
  }

  const categories = [
    { key: 'Strongly Recommended', icon: Star, color: 'text-emerald-600' },
    { key: 'Recommended', icon: CheckCircle2, color: 'text-blue-600' },
    { key: 'Consider', icon: AlertTriangle, color: 'text-amber-600' },
    { key: 'Not Recommended', icon: TrendingDown, color: 'text-gray-600' },
  ];

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const count = breakdown[cat.key] || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={cat.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <cat.icon className={`w-4 h-4 ${cat.color}`} />
              <span className="text-sm font-medium text-gray-700">{cat.key}</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900">{count}</span>
              <span className="text-[10px] text-gray-500 ml-1">{percentage}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentScreeningsTable({ screenings }: { screenings: { jobTitle: string; totalApplicants: number; shortlistSize: number; screeningDate: string | Date; }[] }) {
  if (screenings.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        <p className="text-sm text-gray-500">No recent screenings</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-3 px-3 text-left">Position</th>
            <th className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-3 px-3 text-right">Applicants</th>
            <th className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-3 px-3 text-right">Shortlisted</th>
            <th className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-3 px-3 text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {screenings.map((s, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 px-3">
                <span className="text-sm font-medium text-gray-900">{s.jobTitle}</span>
              </td>
              <td className="py-3 px-3 text-right">
                <span className="text-sm text-gray-600">{s.totalApplicants}</span>
              </td>
              <td className="py-3 px-3 text-right">
                <span className="text-sm font-bold text-emerald-600">{s.shortlistSize}</span>
              </td>
              <td className="py-3 px-3 text-right">
                <span className="text-sm text-gray-500">
                  {new Date(s.screeningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Analytics Dashboard ──────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { dashboard, loading, refreshDashboard } = useDashboard();
  const { jobs } = useJobs();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const stats = dashboard?.overview;
  const scoreStats = dashboard?.scoreStats;
  const recBreakdown = dashboard?.recBreakdown || {};
  const totalRecs = Object.values(recBreakdown).reduce((a, b) => a + b, 0);
  const topSkills = dashboard?.topSkills || [];
  const commonGaps = dashboard?.commonGaps || [];
  const recentScreenings = dashboard?.recentScreenings || [];
  const candidateSources = dashboard?.candidateSources || [];

  const handleRefresh = () => {
    setRefreshing(true);
    refreshDashboard();
    setTimeout(() => {
      setLastUpdated(new Date());
      setRefreshing(false);
    }, 1000);
  };

  // Calculate conversion rate from recent screenings
  const totalApplicants = recentScreenings.reduce((sum, s) => sum + s.totalApplicants, 0);
  const totalShortlisted = recentScreenings.reduce((sum, s) => sum + s.shortlistSize, 0);
  const overallConversionRate = totalApplicants > 0 ? ((totalShortlisted / totalApplicants) * 100).toFixed(1) : '0';

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="min-h-screen bg-gray-50">
      {/* System Header */}
      <SystemHeader lastUpdated={lastUpdated} />

      {/* Page Header */}
      <div className="px-6 py-5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-gray-600" />
                Talent Analytics
              </h1>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded">
                Executive
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Strategic workforce insights for data-driven decisions
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['7d', '30d', '90d', '6m', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeRange === range
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-all">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading analytics data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard
                label="Total Candidates"
                value={stats?.totalCandidates ?? 0}
                subValue="in pipeline"
                icon={Users}
                delay={0}
              />
              <KPICard
                label="Active Positions"
                value={stats?.activeJobs ?? 0}
                subValue={`of ${stats?.totalJobs ?? 0} total`}
                icon={Briefcase}
                delay={1}
              />
              <KPICard
                label="Screenings"
                value={stats?.totalScreenings ?? 0}
                subValue="completed"
                icon={FileText}
                delay={2}
              />
              <KPICard
                label="Avg Score"
                value={scoreStats ? Math.round(scoreStats.avgScore) : 0}
                subValue="composite"
                icon={Target}
                delay={3}
              />
              <KPICard
                label="Shortlisted"
                value={totalRecs}
                subValue="candidates"
                icon={UserCheck}
                delay={4}
              />
              <KPICard
                label="Conversion"
                value={`${overallConversionRate}%`}
                subValue="rate"
                icon={TrendingUp}
                delay={5}
                trend="up"
                trendValue="+2.1%"
              />
            </motion.div>

            {/* Executive Insights Section */}
            <motion.div variants={itemVariants}>
              <div className="bg-blue-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Executive Insights</h2>
                    <p className="text-sm text-blue-100">Strategic analysis of your hiring performance</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border border-blue-400/30 bg-blue-500/20">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 mt-0.5 text-blue-200" />
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Pipeline Health</p>
                        <p className="text-xs text-blue-200/80 mt-1">
                          {stats?.totalCandidates ?? 0} candidates across {stats?.activeJobs ?? 0} positions
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-blue-400/30 bg-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 mt-0.5 text-blue-200" />
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Quality Score</p>
                        <p className="text-xs text-blue-200/80 mt-1">
                          Average: {scoreStats ? Math.round(scoreStats.avgScore) : 0}/100
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-blue-400/30 bg-blue-500/20">
                    <div className="flex items-start gap-2">
                      <UserCheck className="w-4 h-4 mt-0.5 text-blue-200" />
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Selection Rate</p>
                        <p className="text-xs text-blue-200/80 mt-1">
                          {overallConversionRate}% of applicants shortlisted
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-blue-400/30 bg-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Activity className="w-4 h-4 mt-0.5 text-blue-200" />
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Activity</p>
                        <p className="text-xs text-blue-200/80 mt-1">
                          {stats?.totalScreenings ?? 0} screenings completed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Screenings */}
              <motion.div variants={itemVariants} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
                <SectionHeader
                  icon={Activity}
                  title="Recent Screenings"
                  subtitle="Latest candidate evaluations"
                  action={
                    <Link href="/results" className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1">
                      View all <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                />
                <div className="p-0">
                  <RecentScreeningsTable screenings={recentScreenings} />
                </div>
              </motion.div>

              {/* Candidate Sources */}
              <motion.div variants={itemVariants} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <SectionHeader
                  icon={PieChartIcon}
                  title="Candidate Sources"
                  subtitle="Where candidates come from"
                />
                <div className="p-5 space-y-3">
                  {candidateSources.length > 0 ? (
                    candidateSources.map((source, i) => (
                      <div key={source.source} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: criteriaColors[i % criteriaColors.length] }} />
                        <span className="text-xs font-medium text-gray-700 flex-1">{source.source}</span>
                        <span className="text-xs font-bold text-gray-900">{source.count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No source data available</div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Skill Gap Analysis - Full Width */}
            <motion.div variants={itemVariants} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SectionHeader
                icon={Target}
                title="Skill Supply vs Demand"
                subtitle="Market analysis of critical skills"
              />
              <div className="p-5">
                <SkillGapChart skills={topSkills} gaps={commonGaps} />
              </div>
            </motion.div>

            {/* Third Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Skills */}
              <motion.div variants={itemVariants} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <SectionHeader
                  icon={TrendingUp}
                  title="Top In-Demand Skills"
                  subtitle="Most frequently matched skills"
                />
                <div className="p-5 space-y-3">
                  {topSkills.length > 0 ? (
                    topSkills.slice(0, 5).map((skill, i) => (
                      <div key={skill.skill} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-400 w-5">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{skill.skill}</span>
                            <span className="text-xs font-bold text-gray-900">{skill.count}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="h-full rounded transition-all duration-500"
                              style={{ width: `${Math.min(100, (skill.count / topSkills[0].count) * 100)}%`, backgroundColor: criteriaColors[i % criteriaColors.length] }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No skill data available</div>
                  )}
                </div>
              </motion.div>

              {/* Common Gaps */}
              <motion.div variants={itemVariants} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <SectionHeader
                  icon={AlertTriangle}
                  title="Common Skill Gaps"
                  subtitle="Most frequently missing skills"
                />
                <div className="p-5 space-y-3">
                  {commonGaps.length > 0 ? (
                    commonGaps.slice(0, 5).map((gap, i) => (
                      <div key={gap.skill} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-400 w-5">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{gap.skill}</span>
                            <span className="text-xs font-bold text-amber-600">{gap.missingCount}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="h-full rounded transition-all duration-500 bg-amber-400"
                              style={{ width: `${Math.min(100, (gap.missingCount / commonGaps[0].missingCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No gap data available</div>
                  )}
                </div>
              </motion.div>

              {/* Recommendation Breakdown */}
              <motion.div variants={itemVariants} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <SectionHeader icon={Trophy} title="Recommendation Breakdown" />
                <div className="p-5">
                  <RecommendationChart breakdown={recBreakdown} />
                </div>
              </motion.div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl overflow-hidden text-white">
                <div className="px-5 py-4 border-b border-blue-500/30">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Quick Actions
                  </h2>
                </div>
                <div className="p-4 space-y-2.5">
                  <Link
                    href="/screening"
                    className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all group border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Run Screening</p>
                      <p className="text-[10px] text-blue-100">Evaluate candidates</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>

                  <Link
                    href="/jobs"
                    className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all group border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Manage Jobs</p>
                      <p className="text-[10px] text-blue-100">{stats?.activeJobs ?? 0} active</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>

                  <Link
                    href="/candidates"
                    className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all group border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">View Candidates</p>
                      <p className="text-[10px] text-blue-100">{stats?.totalCandidates ?? 0} in pipeline</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>

                  {/* System Status */}
                  <div className="pt-3 mt-3 border-t border-blue-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-blue-200">System Status</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Operational
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-blue-200">API Response</span>
                      <span className="text-[10px] font-mono text-blue-100">124ms</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Additional Metrics */}
              <motion.div variants={itemVariants} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
                <SectionHeader icon={BarChart3} title="Performance Metrics" subtitle="Key hiring indicators" />
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Jobs</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalJobs ?? 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Jobs</p>
                      <p className="text-2xl font-bold text-emerald-600">{stats?.activeJobs ?? 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avg Score</p>
                      <p className="text-2xl font-bold text-gray-900">{scoreStats ? Math.round(scoreStats.avgScore) : 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Top Score</p>
                      <p className="text-2xl font-bold text-blue-600">{scoreStats ? Math.round(scoreStats.maxScore) : 0}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-4">
            <span>© 2024 TalentHub. All rights reserved.</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}