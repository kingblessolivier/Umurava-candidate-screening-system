'use client';

import React from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useJobs } from '@/hooks/useJobs';
import {
  Briefcase,
  Users,
  Zap,
  TrendingUp,
  ArrowRight,
  Plus,
  Sparkles,
  Target,
  CheckCircle,
  Trophy,
  AlertCircle,
  Star,
  PieChart,
  Activity,
  Clock,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Lightbulb,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { dashboard, loading: dashboardLoading } = useDashboard();
  const { jobs, loading: jobsLoading } = useJobs();

  const stats = dashboard?.overview;
  const scoreStats = dashboard?.scoreStats;
  const recentScreenings = dashboard?.recentScreenings || [];
  const topSkills = dashboard?.topSkills || [];
  const commonGaps = dashboard?.commonGaps || [];
  const recBreakdown = dashboard?.recBreakdown || {};
  const candidateSources = dashboard?.candidateSources || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  // Calculate total recommendations
  const totalRecs = Object.values(recBreakdown).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Your AI-powered hiring command center</p>
            </div>
          </div>
        </div>
        <Link
          href="/screening"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:shadow-blue-600/25"
        >
          <Zap className="w-4 h-4" />
          Run Screening
        </Link>
      </motion.div>

      {/* Primary Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Jobs"
          value={stats?.activeJobs ?? 0}
          subValue={`of ${stats?.totalJobs ?? 0} total`}
          icon={Briefcase}
          color="blue"
          delay={0}
        />
        <StatCard
          label="Total Candidates"
          value={stats?.totalCandidates ?? 0}
          subValue="in pipeline"
          icon={Users}
          color="emerald"
          delay={1}
        />
        <StatCard
          label="Screenings Run"
          value={stats?.totalScreenings ?? 0}
          subValue="AI-powered"
          icon={Zap}
          color="amber"
          delay={2}
        />
        <StatCard
          label="Avg Score"
          value={scoreStats ? Math.round(scoreStats.avgScore) : 0}
          subValue={`${scoreStats ? Math.round(scoreStats.avgConfidence) : 0}% confidence`}
          icon={TrendingUp}
          trend="overall"
          color="purple"
          delay={3}
        />
      </motion.div>

      {/* Main Dashboard Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Screenings */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Recent Screenings</h2>
              </div>
              <Link
                href="/results"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {recentScreenings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 font-medium mb-1">No screenings yet</p>
                <p className="text-xs text-gray-400 mb-4">Run AI-powered candidate screening</p>
                <Link
                  href="/screening"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Run first screening
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentScreenings.map((screening, index) => (
                  <Link
                    key={screening._id}
                    href={`/results/${screening._id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                        <Trophy className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {screening.jobTitle}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="w-3 h-3" /> {screening.totalApplicants} candidates
                          </span>
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <Target className="w-3 h-3" /> {screening.shortlistSize} shortlisted
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" /> {screening.processingTimeMs ? `${(screening.processingTimeMs / 1000).toFixed(1)}s` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Active Positions</h2>
              </div>
              <Link
                href="/jobs"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {jobs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 font-medium mb-1">No jobs created yet</p>
                <Link
                  href="/jobs/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Create your first job
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {jobs.slice(0, 4).map((job) => (
                  <Link
                    key={job._id}
                    href={`/jobs`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {job.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{job.location}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">{job.type}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        job.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          job.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      {job.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Insights */}
        <div className="space-y-6">
          {/* Recommendation Breakdown */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Candidate Quality</h2>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {totalRecs > 0 ? (
                <>
                  <RecBar
                    label="Strongly Recommended"
                    count={recBreakdown['Strongly Recommended'] || 0}
                    total={totalRecs}
                    color="emerald"
                    icon={Star}
                  />
                  <RecBar
                    label="Recommended"
                    count={recBreakdown['Recommended'] || 0}
                    total={totalRecs}
                    color="blue"
                    icon={CheckCircle}
                  />
                  <RecBar
                    label="Consider"
                    count={recBreakdown['Consider'] || 0}
                    total={totalRecs}
                    color="amber"
                    icon={AlertCircle}
                  />
                  <RecBar
                    label="Not Recommended"
                    count={recBreakdown['Not Recommended'] || 0}
                    total={totalRecs}
                    color="gray"
                    icon={AlertCircle}
                  />
                </>
              ) : (
                <div className="text-center py-8">
                  <PieChart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No screening data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Skills in Demand */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Top Skills</h2>
              </div>
            </div>
            <div className="p-5">
              {topSkills.length > 0 ? (
                <div className="space-y-2.5">
                  {topSkills.slice(0, 6).map((skill, index) => (
                    <div key={skill.skill} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{skill.skill}</span>
                      </div>
                      <span className="text-xs text-gray-500">{skill.count} matches</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">No skills data yet</p>
              )}
            </div>
          </div>

          {/* Common Skill Gaps */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Common Gaps</h2>
              </div>
            </div>
            <div className="p-5">
              {commonGaps.length > 0 ? (
                <div className="space-y-2">
                  {commonGaps.slice(0, 5).map((gap) => (
                    <div key={gap.skill} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{gap.skill}</span>
                      <span className="text-xs text-amber-600 font-medium">{gap.count} missing</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">No gap data yet</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Row - Candidate Sources */}
      <motion.div variants={itemVariants} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Candidate Sources</h2>
          </div>
        </div>
        <div className="p-5">
          {candidateSources.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {candidateSources.map((source) => (
                <div
                  key={source.source}
                  className="bg-gray-50 rounded-xl p-4 text-center"
                >
                  <div className="text-2xl font-bold text-gray-900">{source.count}</div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">{source.source}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">No source data yet</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  trend?: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
  delay: number;
}) {
  const colorStyles = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      gradient: 'from-blue-50 to-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      gradient: 'from-emerald-50 to-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      gradient: 'from-amber-50 to-amber-100',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      gradient: 'from-purple-50 to-purple-100',
    },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1, ease: 'easeOut' }}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-300 group cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {subValue && (
              <span className="text-xs text-gray-400">{subValue}</span>
            )}
          </div>
        </div>
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}
        >
          <Icon className={`w-5 h-5 ${style.text}`} />
        </div>
      </div>
    </motion.div>
  );
}

function RecBar({
  label,
  count,
  total,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  total: number;
  color: 'emerald' | 'blue' | 'amber' | 'gray';
  icon: React.ElementType;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  const colorStyles = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', iconBg: 'bg-emerald-50' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', iconBg: 'bg-blue-50' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', iconBg: 'bg-amber-50' },
    gray: { bg: 'bg-gray-400', text: 'text-gray-600', iconBg: 'bg-gray-50' },
  };

  const style = colorStyles[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded ${style.iconBg} flex items-center justify-center`}>
            <Icon className={`w-3 h-3 ${style.text}`} />
          </div>
          <span className="text-sm text-gray-700">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-gray-900">{count}</span>
          <span className="text-xs text-gray-400 ml-1">({percentage}%)</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${style.bg} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
