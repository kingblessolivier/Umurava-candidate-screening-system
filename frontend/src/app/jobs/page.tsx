'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  Briefcase, Plus, Search, Users, Zap, Edit2, Trash2, Archive,
  MapPin, Clock, Building2, X, Check, FileText, ArrowRight,
  Eye, Share2, MoreVertical, TrendingUp, BarChart3,
} from 'lucide-react';
import { AppDispatch, RootState } from '@/store';
import { deleteJob } from '@/store/jobsSlice';
import { fetchCandidates } from '@/store/candidatesSlice';
import { fetchResults } from '@/store/screeningSlice';
import { useJobs } from '@/hooks/useJobs';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export default function JobsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { jobs, loading, searchQuery, page, totalPages, handleSearch, handlePageChange, handleDeleteJob } = useJobs();
  const { items: candidates } = useSelector((s: RootState) => s.candidates);
  const screeningResults = useSelector((s: RootState) => s.screening.results);

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'candidates' | 'screening' | 'analytics'>('overview');

  useEffect(() => {
    dispatch(fetchCandidates());
    dispatch(fetchResults());
  }, [dispatch]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (filterStatus === 'active' && !job.isActive) return false;
      if (filterStatus === 'inactive' && job.isActive) return false;
      return true;
    });
  }, [jobs, filterStatus]);

  const selectedJob = useMemo(() => jobs.find(j => j._id === selectedJobId), [jobs, selectedJobId]);

  const topScoreByJob = useMemo(() => {
    const map: Record<string, number> = {};
    screeningResults.forEach(r => {
      const score = r.shortlist[0]?.finalScore;
      if (score !== undefined && (!map[r.jobId] || score > map[r.jobId])) {
        map[r.jobId] = score;
      }
    });
    return map;
  }, [screeningResults]);

  const handleDeleteJobClick = async (id: string) => {
    try {
      await handleDeleteJob(id);
      toast.success('Job deleted');
      if (selectedJobId === id) setSelectedJobId(null);
    } catch {
      toast.error('Failed to delete job');
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0">
      {/* Left Panel - Job List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-gray-900">Jobs</h1>
            <Link
              href="/jobs/new"
              className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search jobs..."
              className="w-full pl-9 pr-3 py-1 text-[10px] border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`flex-1 py-0.5 text-[10px] font-medium rounded-md transition-colors capitalize ${
                  filterStatus === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Job List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-8 text-center px-4">
              <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">
                {searchQuery ? 'No jobs match your search' : 'No jobs yet'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredJobs.map(job => (
                <JobListItem
                  key={job._id}
                  job={job}
                  isSelected={selectedJobId === job._id}
                  topScore={topScoreByJob[job._id!]}
                  onClick={() => setSelectedJobId(job._id!)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredJobs.length > 0 && (
          <div className="px-2 py-3 border-t border-gray-100">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isLoading={loading}
              itemsPerPage={50}
            />
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            {jobs.filter(j => j.isActive).length} active · {jobs.length} total
          </p>
        </div>
      </div>

      {/* Right Panel - Job Detail */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {selectedJob ? (
          <JobDetailView
            job={selectedJob}
            candidates={candidates.filter(c => c.jobId === selectedJob._id)}
            screeningResults={screeningResults.filter(r => r.jobId === selectedJob._id)}
            currentTab={detailTab}
            onTabChange={setDetailTab}
            onEdit={() => {}}
            onDelete={() => setDeleteConfirm(selectedJob._id!)}
            onAddCandidates={() => {}}
            onRunScreening={() => {}}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Select a job</p>
            <p className="text-xs text-gray-500">Choose a job from the list to view details</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Job</h3>
            <p className="text-sm text-gray-500 mb-5">
              Delete "{jobs.find(j => j._id === deleteConfirm)?.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteJobClick(deleteConfirm)}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Job List Item
function JobListItem({
  job,
  isSelected,
  topScore,
  onClick,
}: {
  job: any;
  isSelected: boolean;
  topScore?: number;
  onClick: () => void;
}) {
  const initials = job.title.split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');

  const levelColors: Record<string, string> = {
    Junior: 'bg-green-50 text-green-600',
    'Mid-level': 'bg-blue-50 text-blue-600',
    Senior: 'bg-purple-50 text-purple-600',
    Lead: 'bg-amber-50 text-amber-600',
    Executive: 'bg-red-50 text-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-1.5 rounded-lg transition-all mb-0.5 ${
        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[10px] font-medium text-gray-900 truncate">{job.title}</span>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${job.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className={`text-[10px] px-1 py-0.5 rounded-full font-medium ${levelColors[job.experienceLevel] || 'bg-gray-100 text-gray-600'}`}>
              {job.experienceLevel}
            </span>
            <span className="text-[10px] text-gray-500">{job.type}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
              <MapPin className="w-2 h-2" /> {job.location}
            </span>
            {topScore !== undefined && (
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                {topScore}%
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// Job Detail View - New Enhanced Version with Tabs
function JobDetailView({
  job,
  candidates,
  screeningResults,
  currentTab,
  onTabChange,
  onEdit,
  onDelete,
  onAddCandidates,
  onRunScreening,
}: {
  job: any;
  candidates: any[];
  screeningResults: any[];
  currentTab: string;
  onTabChange: (tab: any) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddCandidates: () => void;
  onRunScreening: () => void;
}) {
  const levelColors: Record<string, string> = {
    Junior: 'bg-green-50 text-green-700 border-green-200',
    'Mid-level': 'bg-blue-50 text-blue-700 border-blue-200',
    Senior: 'bg-purple-50 text-purple-700 border-purple-200',
    Lead: 'bg-amber-50 text-amber-700 border-amber-200',
    Executive: 'bg-red-50 text-red-700 border-red-200',
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'candidates', label: `Candidates (${candidates.length})` },
    { id: 'screening', label: `Screening` },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Actions (Gmail-style) */}
      <div className="border-b border-gray-200 px-3 py-1">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight mb-0.5">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600 leading-tight">
              {job.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {job.department}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {job.type}
              </span>
            </div>
          </div>

          {/* Action Buttons (Gmail-style toolbar) */}
          <div className="flex gap-1">
            <Link
              href={`/jobs/${job._id}/edit`}
              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </Link>
            <button
              onClick={onDelete}
              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${levelColors[job.experienceLevel] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
            {job.experienceLevel}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${job.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
            <span className={`inline-block w-1 h-1 rounded-full mr-1 ${job.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {job.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 px-3 py-1.5">
        <div className="flex gap-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'py-2 px-0.5 border-b-2 text-xs font-medium transition-colors',
                currentTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {currentTab === 'overview' && (
          <OverviewTab job={job} onAddCandidates={onAddCandidates} onRunScreening={onRunScreening} />
        )}
        {currentTab === 'candidates' && (
          <CandidatesTab candidates={candidates} jobId={job._id} />
        )}
        {currentTab === 'screening' && (
          <ScreeningTab screeningResults={screeningResults} job={job} />
        )}
        {currentTab === 'analytics' && (
          <AnalyticsTab candidates={candidates} screeningResults={screeningResults} job={job} />
        )}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ job, onAddCandidates, onRunScreening }: any) {
  return (
    <div className="space-y-3 max-w-4xl">
      {/* Description */}
      {job.description && (
        <div className="bg-gray-50 rounded-lg p-2">
          <h2 className="font-semibold text-xs text-gray-900 mb-1.5">Job Description</h2>
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Responsibilities */}
        <div>
          <h2 className="font-semibold text-xs text-gray-900 mb-1.5">Responsibilities</h2>
          {job.responsibilities?.length > 0 ? (
            <ul className="space-y-1">
              {job.responsibilities.map((r: string, i: number) => (
                <li key={i} className="flex gap-1.5 text-xs text-gray-700">
                  <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">No responsibilities added</p>
          )}
        </div>

        {/* Skills */}
        <div>
          <h2 className="font-semibold text-xs text-gray-900 mb-1.5">Required Skills</h2>
          {job.requirements?.length > 0 ? (
            <div className="space-y-1">
              {job.requirements.map((req: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-1 bg-blue-50 rounded border border-blue-100">
                  <span className="text-xs font-medium text-gray-900">{req.skill}</span>
                  {req.required && <span className="text-xs text-blue-600 font-medium">Required</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No skills added</p>
          )}
        </div>
      </div>

      {/* Nice to Have */}
      {job.niceToHave?.length > 0 && (
        <div>
          <h2 className="font-semibold text-xs text-gray-900 mb-1.5">Nice to Have</h2>
          <div className="flex flex-wrap gap-1">
            {job.niceToHave.map((skill: string, i: number) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 pt-1">
        <Link
          href="/candidates/upload"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition"
        >
          <Users className="w-3 h-3" /> Add Candidates
        </Link>
        <Link
          href={`/screening?jobId=${job._id}`}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
        >
          <Zap className="w-3 h-3" /> Run Screening
        </Link>
      </div>
    </div>
  );
}

// Candidates Tab
function CandidatesTab({ candidates, jobId }: any) {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-6">
        <Users className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
        <p className="text-xs text-gray-600">No candidates yet for this job</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-w-4xl">
      {candidates.map((candidate) => (
        <div key={candidate._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
              {candidate.firstName[0]}{candidate.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-xs text-gray-900">{candidate.firstName} {candidate.lastName}</p>
              <p className="text-xs text-gray-600 truncate">{candidate.email}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button className="p-1 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition">
              <Eye className="w-3 h-3" />
            </button>
            <button className="p-1 text-gray-600 hover:text-red-600 hover:bg-white rounded transition">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Screening Tab
function ScreeningTab({ screeningResults, job }: any) {
  const latestResult = screeningResults[0];

  if (!latestResult) {
    return (
      <div className="text-center py-6">
        <Zap className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
        <p className="text-xs text-gray-600 mb-2">No screening results yet</p>
        <Link
          href={`/screening?jobId=${job._id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
        >
          <Zap className="w-3 h-3" /> Run Screening
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-w-4xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
        <h3 className="font-semibold text-xs text-gray-900 mb-1.5">Latest Screening Results</h3>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div>
            <p className="text-xs text-gray-600">Shortlisted</p>
            <p className="text-lg font-bold text-green-600">{latestResult.shortlist?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Rejected</p>
            <p className="text-lg font-bold text-red-600">{latestResult.totalApplicants - (latestResult.shortlist?.length || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Total</p>
            <p className="text-lg font-bold text-gray-900">{latestResult.totalApplicants}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Top Score</p>
            <p className="text-lg font-bold text-blue-600">{latestResult.shortlist?.[0]?.finalScore}%</p>
          </div>
        </div>
      </div>

      {/* Shortlisted Candidates */}
      <div>
        <h3 className="font-semibold text-xs text-gray-900 mb-1">Shortlisted Candidates</h3>
        <div className="space-y-1">
          {latestResult.shortlist?.map((candidate: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-1.5 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-xs text-gray-900">{candidate.candidateName}</p>
                <p className="text-xs text-gray-600">{candidate.summary?.slice(0, 50)}...</p>
              </div>
              <p className="text-base font-bold text-green-600">{candidate.finalScore}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Analytics Tab
function AnalyticsTab({ candidates, screeningResults, job }: any) {
  const latestResult = screeningResults[0];
  const shortlistedCount = latestResult?.shortlist?.length || 0;
  const totalCandidates = candidates.length;
  const shortlistRate = totalCandidates > 0 ? ((shortlistedCount / totalCandidates) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-2.5 max-w-4xl">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Candidates</p>
              <p className="text-xl font-bold text-blue-600">{totalCandidates}</p>
            </div>
            <Users className="w-5 h-5 text-blue-300" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-2 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Shortlisted</p>
              <p className="text-xl font-bold text-green-600">{shortlistedCount}</p>
            </div>
            <Check className="w-5 h-5 text-green-300" />
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Shortlist Rate</p>
              <p className="text-xl font-bold text-amber-600">{shortlistRate}%</p>
            </div>
            <TrendingUp className="w-5 h-5 text-amber-300" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Screenings</p>
              <p className="text-xl font-bold text-purple-600">{screeningResults.length}</p>
            </div>
            <BarChart3 className="w-5 h-5 text-purple-300" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 rounded-lg p-2">
        <p className="text-xs text-gray-700">
          Out of <span className="font-semibold">{totalCandidates}</span> candidates, <span className="font-semibold text-green-600">{shortlistedCount}</span> have been shortlisted across <span className="font-semibold">{screeningResults.length}</span> screening round(s).
        </p>
      </div>
    </div>
  );
}

// Placeholder for removed code - keeping the old function structure
function JobDetail() {
  return null;
}
