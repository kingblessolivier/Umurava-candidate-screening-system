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
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { dashboard, loading: dashboardLoading } = useDashboard();
  const { jobs, loading: jobsLoading } = useJobs();

  const stats = dashboard?.overview;
  const scoreStats = dashboard?.scoreStats;
  const recentScreenings = dashboard?.recentScreenings || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Welcome back. Here's your hiring overview.</p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New Job
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Jobs"        value={stats?.activeJobs ?? '—'}        icon={Briefcase} />
        <StatCard label="Total Candidates"   value={stats?.totalCandidates ?? '—'}   icon={Users} />
        <StatCard label="Screenings"         value={stats?.totalScreenings ?? '—'}   icon={Zap} />
        <StatCard
          label="Avg Score"
          value={scoreStats ? `${Math.round(scoreStats.avgScore)}%` : '—'}
          icon={TrendingUp}
          trend={scoreStats ? `${Math.round(scoreStats.avgConfidence)}% confidence` : undefined}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Jobs */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/jobs" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {jobs.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mb-2">No jobs created yet</p>
                <Link href="/jobs/new" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-3 h-3" /> Create your first job
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {jobs.slice(0, 5).map((job) => (
                  <Link
                    key={job._id}
                    href={`/jobs`}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {job.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-500">{job.location}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-[10px] text-gray-500">{job.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        job.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${job.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Screenings */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-900">Recent Screenings</h2>
            <Link href="/results" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {recentScreenings.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mb-2">No screenings yet</p>
                <Link href="/screening" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Run first screening →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentScreenings.slice(0, 5).map((screening) => (
                  <Link
                    key={screening._id}
                    href={`/results/${screening._id}`}
                    className="block px-3 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <p className="text-xs font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {screening.jobTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Users className="w-2.5 h-2.5" /> {screening.totalApplicants}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Zap className="w-2.5 h-2.5" /> {screening.shortlistSize} shortlisted
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <QuickAction href="/jobs/new"            icon={Briefcase} label="Create Job"         description="Post a new job position" />
          <QuickAction href="/candidates/upload"   icon={Users}     label="Upload Candidates"  description="Import from CSV, PDF, or JSON" />
          <QuickAction href="/screening"           icon={Zap}       label="Run Screening"      description="AI-powered candidate ranking" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, trend,
}: {
  label: string; value: string | number; icon: React.ElementType; trend?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-blue-600" />
        </div>
      </div>
      <span className="text-xl font-bold text-gray-900">{value}</span>
      {trend && <p className="text-[10px] text-gray-400 mt-1">{trend}</p>}
    </div>
  );
}

function QuickAction({
  href, icon: Icon, label, description,
}: {
  href: string; icon: React.ElementType; label: string; description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{label}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}
