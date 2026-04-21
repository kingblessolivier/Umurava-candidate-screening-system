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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back. Here's your hiring overview.</p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Jobs"
          value={stats?.activeJobs ?? '—'}
          icon={Briefcase}
        />
        <StatCard
          label="Total Candidates"
          value={stats?.totalCandidates ?? '—'}
          icon={Users}
        />
        <StatCard
          label="Screenings"
          value={stats?.totalScreenings ?? '—'}
          icon={Zap}
        />
        <StatCard
          label="Avg Score"
          value={scoreStats ? `${Math.round(scoreStats.avgScore)}%` : '—'}
          icon={TrendingUp}
          trend={scoreStats ? `${Math.round(scoreStats.avgConfidence)}% confidence` : undefined}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div>
            {jobs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-3">No jobs created yet</p>
                <Link href="/jobs/new" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-4 h-4" /> Create your first job
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {jobs.slice(0, 5).map((job) => (
                  <Link
                    key={job._id}
                    href={`/jobs/${job._id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {job.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{job.location}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">{job.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        job.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${job.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Screenings */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Screenings</h2>
            <Link href="/results" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div>
            {recentScreenings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-3">No screenings yet</p>
                <Link href="/screening" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Run first screening →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentScreenings.slice(0, 5).map((screening) => (
                  <Link
                    key={screening._id}
                    href={`/results/${screening._id}`}
                    className="block px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {screening.jobTitle}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3" /> {screening.totalApplicants}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Zap className="w-3 h-3" /> {screening.shortlistSize} shortlisted
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
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <QuickAction
            href="/jobs/new"
            icon={Briefcase}
            label="Create Job"
            description="Post a new job position"
          />
          <QuickAction
            href="/candidates/upload"
            icon={Users}
            label="Upload Candidates"
            description="Import from CSV, PDF, or JSON"
          />
          <QuickAction
            href="/screening"
            icon={Zap}
            label="Run Screening"
            description="AI-powered candidate ranking"
          />
        </div>
      </div>
    </div>
  );
}

// StatCard
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
      </div>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {trend && <p className="text-xs text-gray-400 mt-1.5">{trend}</p>}
    </div>
  );
}

// QuickAction
function QuickAction({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}
