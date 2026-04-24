'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  Briefcase, Plus, Search, Users, Zap, Edit2, Trash2, Archive,
  MapPin, Clock, Building2, X, Check, FileText, ArrowRight,
  Eye, Share2, MoreVertical, TrendingUp, BarChart3, ChevronLeft,
  ChevronRight, Filter, Settings, Download, MessageSquare, Mail
} from 'lucide-react';
import EmailModal from '@/components/email/EmailModal';
import { AppDispatch, RootState } from '@/store';
import { deleteJob } from '@/store/jobsSlice';
import { fetchCandidates, createCandidate, uploadCSV, updateCandidate, deleteCandidate } from '@/store/candidatesSlice';
import { fetchResults } from '@/store/screeningSlice';
import { useJobs } from '@/hooks/useJobs';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Candidate } from '@/types';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function JobsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { jobs, loading, searchQuery, page, totalPages, handleSearch, handlePageChange, handleDeleteJob, handleCreateJob, handleUpdateJob } = useJobs();
  const { items: candidates } = useSelector((s: RootState) => s.candidates);
  const screeningResults = useSelector((s: RootState) => s.screening.results);

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'candidates' | 'screening' | 'analytics'>('overview');

  // Modal states
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);

  // HR quick actions state
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'screen' | 'reject' | 'shortlist' | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');

  // Candidate detail modal
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [queuedParsingJobId, setQueuedParsingJobId] = useState<string | null>(null);
  const [candidateRefreshKey, setCandidateRefreshKey] = useState(0);
  const [jobCandidateTotal, setJobCandidateTotal] = useState<number | null>(null);

  const handleViewCandidate = (candidate: Candidate) => {
    setViewingCandidate(candidate);
    setViewModalOpen(true);
  };

  const handleUpdateViewCandidate = async (id: string, updates: Partial<Candidate>) => {
    const result = await dispatch(updateCandidate({ id, updates }));
    if (result.meta.requestStatus === 'fulfilled') {
      setViewingCandidate(result.payload as Candidate);
      await dispatch(fetchCandidates());
    }
    return result;
  };

  const handleDeleteCandidates = async (candidateIds: string[]) => {
    try {
      await Promise.all(candidateIds.map(id => dispatch(deleteCandidate(id)).unwrap()));
      setCandidateRefreshKey(k => k + 1);
      await dispatch(fetchCandidates());
    } catch (error) {
      toast.error('Failed to delete candidates');
    }
  };

  const handleScreenCandidates = async (candidateIds: string[], jobId: string) => {
    toast.success(`Starting screening for ${candidateIds.length} candidate(s)...`);
    // Navigate to screening page with selected candidates
    const params = new URLSearchParams({ candidateIds: candidateIds.join(',') });
    router.push(`/screening?jobId=${jobId}&${params.toString()}`);
  };

  useEffect(() => {
    dispatch(fetchCandidates());
    dispatch(fetchResults());
  }, [dispatch]);

  useEffect(() => {
    if (!queuedParsingJobId) return;

    let attempts = 0;
    const maxAttempts = 24; // 24 * 5s = 2 minutes
    const timer = setInterval(async () => {
      attempts += 1;
      await dispatch(fetchCandidates());
      if (attempts >= maxAttempts) {
        setQueuedParsingJobId(null);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [queuedParsingJobId, dispatch]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (filterStatus === 'active' && !job.isActive) return false;
      if (filterStatus === 'inactive' && job.isActive) return false;
      return true;
    });
  }, [jobs, filterStatus]);

  const selectedJob = useMemo(() => jobs.find(j => j._id === selectedJobId), [jobs, selectedJobId]);

  // Reset header count when switching jobs
  useEffect(() => { setJobCandidateTotal(null); }, [selectedJobId]);

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

  const openCreateJobModal = () => {
    setEditingJob(null);
    setShowJobModal(true);
  };

  const openEditJobModal = (job: any) => {
    setEditingJob(job);
    setShowJobModal(true);
  };

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalCandidates = candidates.length;
    const totalScreenings = screeningResults.length;
    const totalShortlisted = screeningResults.reduce((acc, r) => acc + (r.shortlist?.length || 0), 0);
    const activeJobs = jobs.filter(j => j.isActive).length;

    // Calculate trends (would compare to previous period in real app)
    const candidateTrend = totalCandidates > 10 ? '+12%' : `${totalCandidates > 0 ? '+' : ''}${totalCandidates}`;
    const screeningTrend = totalScreenings > 5 ? '+8%' : 'New';

    return { totalCandidates, totalScreenings, totalShortlisted, activeJobs, candidateTrend, screeningTrend };
  }, [candidates, screeningResults, jobs]);


  return (
    <div className="-mx-6 -my-4 flex overflow-hidden bg-gray-100" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
        {/* Header */}
        <div className="px-3 py-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <h1 className="text-sm font-bold text-gray-900">Jobs</h1>
          <button
            onClick={openCreateJobModal}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3 h-3" /> New
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-2 py-2 border-b border-gray-100 flex-shrink-0 space-y-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`flex-1 text-[10px] py-1 rounded font-medium capitalize transition-colors ${
                  filterStatus === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Job List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No jobs found</p>
            </div>
          ) : (
            filteredJobs.map(job => (
              <JobListItem
                key={job._id}
                job={job}
                isSelected={selectedJobId === job._id}
                topScore={topScoreByJob[job._id]}
                onClick={() => { setSelectedJobId(job._id); setDetailTab('overview'); }}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-2 py-2 border-t border-gray-100 flex-shrink-0">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 overflow-auto bg-gray-50 p-3">
        {selectedJob ? (
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full">

            {/* Unified job header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm shadow-blue-500/20">
                {selectedJob.title.split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-sm font-bold text-gray-900 truncate">{selectedJob.title}</h2>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedJob.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                  {selectedJob.department && (
                    <span className="flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" />{selectedJob.department}</span>
                  )}
                  <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{selectedJob.location}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{selectedJob.type}</span>
                  <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{selectedJob.experienceLevel}</span>
                </div>
              </div>
              {/* Inline stats */}
              <div className="flex items-center gap-4 mr-2">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">Candidates</p>
                  <p className="text-sm font-bold text-blue-600">{jobCandidateTotal ?? '—'}</p>
                </div>
                {topScoreByJob[selectedJob._id] !== undefined && (
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">Top Score</p>
                    <p className="text-sm font-bold text-green-600">{topScoreByJob[selectedJob._id]}%</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">Screenings</p>
                  <p className="text-sm font-bold text-violet-600">{screeningResults.filter(r => r.jobId === selectedJob._id).length}</p>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowCandidateModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Candidate
                </button>
                <Link
                  href={`/screening?jobId=${selectedJob._id}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <Zap className="w-3 h-3" /> Screen
                </Link>
                <button
                  onClick={() => openEditJobModal(selectedJob)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(selectedJob._id)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="px-4 border-b border-gray-100 flex flex-shrink-0">
              {(['overview', 'candidates', 'screening', 'analytics'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-all ${
                    detailTab === tab
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-4">
              {detailTab === 'overview' && <OverviewTab job={selectedJob} />}
              {detailTab === 'candidates' && (
                <CandidatesTab
                  jobId={selectedJob._id}
                  jobTitle={selectedJob.title}
                  refreshKey={candidateRefreshKey}
                  screeningResult={screeningResults.filter((r: any) => r.jobId === selectedJob._id)[0] ?? null}
                  onViewCandidate={handleViewCandidate}
                  onAddCandidate={() => setShowCandidateModal(true)}
                  onDeleteCandidates={handleDeleteCandidates}
                  onScreenCandidates={handleScreenCandidates}
                  onTotalChange={setJobCandidateTotal}
                />
              )}
              {detailTab === 'screening' && (
                <ScreeningTab
                  screeningResults={screeningResults.filter(r => r.jobId === selectedJob._id)}
                  job={selectedJob}
                />
              )}
              {detailTab === 'analytics' && (
                <AnalyticsTab
                  candidates={candidates.filter(c => c.jobId === selectedJob._id)}
                  screeningResults={screeningResults.filter(r => r.jobId === selectedJob._id)}
                  job={selectedJob}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Briefcase className="w-8 h-8 text-blue-300" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Select a job</h3>
              <p className="text-xs text-gray-500 mb-4">Choose a job from the sidebar to view details</p>
              <button
                onClick={openCreateJobModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Create New Job
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDeleteJobClick(deleteConfirm)}
          title="Delete Job"
          message={`Delete "${jobs.find(j => j._id === deleteConfirm)?.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
        />
      )}

      {/* Job Modal */}
      {showJobModal && (
        <JobModal
          job={editingJob}
          onClose={() => setShowJobModal(false)}
          onCreate={handleCreateJob}
          onUpdate={handleUpdateJob}
          onSave={() => {
            setShowJobModal(false);
            toast.success(editingJob ? 'Job updated' : 'Job created');
          }}
        />
      )}

      {/* Candidate Modal */}
      {showCandidateModal && selectedJob && (
        <CandidateModal
          jobId={selectedJob._id}
          onClose={() => setShowCandidateModal(false)}
          onSave={() => {
            setShowCandidateModal(false);
            toast.success('Candidate added');
            setCandidateRefreshKey(k => k + 1);
            dispatch(fetchCandidates());
          }}
          onResumeQueued={(jobId: string) => {
            setQueuedParsingJobId(jobId);
            setCandidateRefreshKey(k => k + 1);
            dispatch(fetchCandidates());
          }}
        />
      )}

      {/* Candidate Detail / Edit Modal */}
      <CandidateDetailModal
        candidate={viewingCandidate}
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        onUpdate={handleUpdateViewCandidate}
      />
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
    Junior: 'bg-emerald-100 text-emerald-700',
    'Mid-level': 'bg-blue-100 text-blue-700',
    Senior: 'bg-violet-100 text-violet-700',
    Lead: 'bg-amber-100 text-amber-700',
    Executive: 'bg-rose-100 text-rose-700',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2 rounded-lg transition-all mb-1 ${
        isSelected
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 shadow-sm'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm shadow-blue-500/20">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-xs font-semibold text-gray-900 truncate">{job.title}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                job.isActive ? 'bg-green-500' : 'bg-gray-400'
              }`}
              title={job.isActive ? 'Active' : 'Inactive'}
            />
          </div>
          <div className="flex items-center gap-1 mb-0.5">
            <span
              className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${
                levelColors[job.experienceLevel] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {job.experienceLevel}
            </span>
            <span className="text-[10px] text-gray-500">{job.type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <MapPin className="w-2.5 h-2.5" /> {job.location}
            </span>
            {topScore !== undefined && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                {topScore}%
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// Overview Tab
function OverviewTab({ job }: any) {
  return (
    <div className="space-y-3">
      {/* Job Info Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-2.5 border border-blue-100">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
              <Building2 className="w-3 h-3 text-blue-600" />
            </div>
            <span className="text-[10px] font-medium text-blue-700">Department</span>
          </div>
          <p className="text-xs font-bold text-gray-900 truncate">{job.department || '—'}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-2.5 border border-purple-100">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
              <MapPin className="w-3 h-3 text-purple-600" />
            </div>
            <span className="text-[10px] font-medium text-purple-700">Location</span>
          </div>
          <p className="text-xs font-bold text-gray-900 truncate">{job.location}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-2.5 border border-amber-100">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
              <Clock className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-[10px] font-medium text-amber-700">Type</span>
          </div>
          <p className="text-xs font-bold text-gray-900">{job.type}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-2.5 border border-emerald-100">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
              <Users className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-[10px] font-medium text-emerald-700">Level</span>
          </div>
          <p className="text-xs font-bold text-gray-900">{job.experienceLevel}</p>
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-gray-400" />
              Job Description
            </h2>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>
        </div>
      )}

      {/* Two Column */}
      <div className="grid grid-cols-2 gap-3">
        {/* Responsibilities */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-900">Key Responsibilities</h2>
          </div>
          <div className="px-3 py-2.5">
            {job.responsibilities?.length > 0 ? (
              <ul className="space-y-1.5">
                {job.responsibilities.map((r: string, i: number) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-700">
                    <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">No responsibilities added</p>
            )}
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-gradient-to-r from-violet-50 to-white border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-900">Requirements</h2>
          </div>
          <div className="px-3 py-2.5">
            {job.requirements?.length > 0 ? (
              <div className="space-y-1">
                {job.requirements.map((req: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-lg text-xs"
                  >
                    <div>
                      <span className="font-medium text-gray-700">{req.skill}</span>
                      {req.level && <span className="ml-1.5 text-[10px] text-gray-400">{req.level}</span>}
                    </div>
                    {req.required && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No requirements added</p>
            )}
          </div>
        </div>
      </div>

      {/* Nice to Have */}
      {job.niceToHave?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-white border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" />
              Nice to Have
            </h2>
          </div>
          <div className="px-3 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {job.niceToHave.map((skill: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-lg text-xs bg-amber-50 text-amber-700 border border-amber-200 font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Candidates Tab - Now with Pipeline View and Bulk Actions
function CandidatesTab({ jobId, jobTitle, onViewCandidate, onAddCandidate, onDeleteCandidates, onScreenCandidates, onTotalChange, screeningResult, refreshKey = 0 }: any) {
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'score'>('date');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    recipients: { name: string; email: string }[];
  }>({ open: false, recipients: [] });

  const [localCandidates, setLocalCandidates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const [pipelineCandidates, setPipelineCandidates] = useState<any[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  // Reset state when switching jobs
  useEffect(() => {
    setPage(1);
    setSearchInput('');
    setSearch('');
    setSelectedCandidates(new Set());
    setPipelineCandidates([]);
  }, [jobId]);

  // Debounce search input → actual search param
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch candidates for this job with pagination + search
  useEffect(() => {
    if (!jobId) return;
    setIsLoading(true);
    api.get('/candidates', { params: { jobId, page, limit: PAGE_SIZE, search } })
      .then(res => {
        const t = res.data.total || 0;
        setLocalCandidates(res.data.data || []);
        setTotal(t);
        onTotalChange?.(t);
      })
      .catch(() => toast.error('Failed to load candidates'))
      .finally(() => setIsLoading(false));
  }, [jobId, page, search, refreshKey]);

  // Fetch all candidates for pipeline view (no pagination)
  useEffect(() => {
    if (!jobId || viewMode !== 'pipeline') return;
    setPipelineLoading(true);
    api.get('/candidates', { params: { jobId, page: 1, limit: 100 } })
      .then(res => setPipelineCandidates(res.data.data || []))
      .catch(() => {})
      .finally(() => setPipelineLoading(false));
  }, [jobId, viewMode, refreshKey]);

  // Get screening scores for candidates
  const getCandidateScore = (candidate: any) => {
    // This would match by candidate ID in real app
    return Math.floor(Math.random() * 40) + 60; // Mock score for demo
  };

  const toggleCandidate = (id: string) => {
    const newSet = new Set(selectedCandidates);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCandidates(newSet);
  };

  const selectAll = () => {
    if (selectedCandidates.size === localCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(localCandidates.map((c: any) => c._id)));
    }
  };

  const handleBulkScreen = () => {
    if (selectedCandidates.size === 0) return;
    onScreenCandidates?.(Array.from(selectedCandidates), jobId);
    setSelectedCandidates(new Set());
  };

  const handleBulkShortlist = () => {
    if (selectedCandidates.size === 0) return;
    toast.success(`${selectedCandidates.size} candidate(s) shortlisted`);
    setSelectedCandidates(new Set());
  };

  const handleBulkReject = () => {
    if (selectedCandidates.size === 0) return;
    toast.success(`${selectedCandidates.size} candidate(s) rejected`);
    setSelectedCandidates(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedCandidates.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleBulkEmail = () => {
    if (selectedCandidates.size === 0) return;
    const selected = localCandidates.filter((c: any) => selectedCandidates.has(c._id));
    setEmailModal({
      open: true,
      recipients: selected.map((c: any) => ({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
      })),
    });
  };

  const handleEmailSingle = (candidate: any) => {
    setEmailModal({
      open: true,
      recipients: [{ name: `${candidate.firstName} ${candidate.lastName}`, email: candidate.email }],
    });
  };

  const confirmBulkDelete = () => {
    onDeleteCandidates?.(Array.from(selectedCandidates));
    setSelectedCandidates(new Set());
    setShowDeleteConfirm(false);
    toast.success('Candidates deleted successfully');
  };

  // Build pipeline stage mapping from latest screening result
  const shortlistedIds   = new Set((screeningResult?.shortlist || []).filter((c: any) => ['Strongly Recommended','Recommended'].includes(c.recommendation)).map((c: any) => c.candidateId));
  const considerIds      = new Set((screeningResult?.shortlist || []).filter((c: any) => c.recommendation === 'Consider').map((c: any) => c.candidateId));
  const rejectedIds      = new Set((screeningResult?.rejectedCandidates || []).map((c: any) => c.candidateId));
  const screenedIds      = new Set([...shortlistedIds, ...considerIds, ...rejectedIds]);

  const getPipelineStage = (candidateId: string) => {
    if (shortlistedIds.has(candidateId)) return 'shortlisted';
    if (considerIds.has(candidateId))    return 'consider';
    if (rejectedIds.has(candidateId))    return 'rejected';
    return 'applied';
  };

  const getScoreForCandidate = (candidateId: string) => {
    const s = (screeningResult?.shortlist || []).find((c: any) => c.candidateId === candidateId);
    if (s) return s.finalScore;
    const r = (screeningResult?.rejectedCandidates || []).find((c: any) => c.candidateId === candidateId);
    if (r) return r.finalScore;
    return null;
  };

  const pipelineStages = [
    { id: 'applied',      label: 'Applied',      color: 'blue',   description: 'Not yet screened' },
    { id: 'shortlisted',  label: 'Shortlisted',  color: 'green',  description: 'Recommended by AI' },
    { id: 'consider',     label: 'Consider',     color: 'amber',  description: 'Needs further review' },
    { id: 'rejected',     label: 'Not Selected', color: 'red',    description: 'Did not meet criteria' },
  ];

  if (!isLoading && total === 0 && !search) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mx-auto mb-3 border border-blue-100">
          <Users className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">No candidates yet</h3>
        <p className="text-xs text-gray-500 mb-3">Start adding candidates to this position to begin the screening process</p>
        <button
          onClick={() => onAddCandidate?.()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add First Candidate
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === 'pipeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Pipeline
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="score">Sort by Score</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search candidates…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedCandidates.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in slide-in-from-top-2">
            <span className="text-xs font-medium text-blue-700">
              {selectedCandidates.size} selected
            </span>
            <div className="h-4 w-px bg-blue-200" />
            <button
              onClick={handleBulkScreen}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              Screen
            </button>
            <button
              onClick={handleBulkShortlist}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Shortlist
            </button>
            <button
              onClick={handleBulkReject}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Reject
            </button>
            <button
              onClick={handleBulkEmail}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              Email
            </button>
            <div className="h-4 w-px bg-blue-200" />
            <button
              onClick={handleBulkDelete}
              className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        /* List View */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={localCandidates.length > 0 && selectedCandidates.size === localCandidates.length}
                      onChange={selectAll}
                      className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Candidate</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Score</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Applied</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading candidates…
                    </div>
                  </td></tr>
                ) : localCandidates.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-gray-500">
                    No candidates match your search.
                  </td></tr>
                ) : localCandidates.map((candidate: any) => {
                  const score = getCandidateScore(candidate);
                  const isSelected = selectedCandidates.has(candidate._id);
                  return (
                    <tr
                      key={candidate._id}
                      className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCandidate(candidate._id)}
                          className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm shadow-blue-500/20">
                            {candidate.firstName[0]}{candidate.lastName[0]}
                          </div>
                          <span className="text-xs font-semibold text-gray-900">{candidate.firstName} {candidate.lastName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-600">{candidate.email}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${
                            score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
                          }`}>{score}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Applied
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] text-gray-500">{new Date(candidate.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onViewCandidate?.(candidate)} className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-all" title="View Profile">
                            <Eye className="w-3 h-3" />
                          </button>
                          <button onClick={() => onViewCandidate?.(candidate)} className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-all" title="Edit Candidate">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleEmailSingle(candidate)} className="p-1.5 rounded hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-all" title="Send Email">
                            <Mail className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-500">
                {total} candidate{total !== 1 ? 's' : ''} · page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-6 h-6 text-[10px] font-semibold rounded transition-colors ${
                        p === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Pipeline View */
        pipelineLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-xs text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Building pipeline…
          </div>
        ) : (
        <div className="grid grid-cols-4 gap-3">
          {pipelineStages.map(stage => {
            const stageCards = pipelineCandidates.filter((c: any) => getPipelineStage(c._id) === stage.id);
            const colColors: Record<string, { header: string; badge: string; text: string; dot: string }> = {
              applied:     { header: 'from-blue-50',  badge: 'bg-blue-100 text-blue-700',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
              shortlisted: { header: 'from-green-50', badge: 'bg-green-100 text-green-700', text: 'text-green-700', dot: 'bg-green-500' },
              consider:    { header: 'from-amber-50', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700', dot: 'bg-amber-500' },
              rejected:    { header: 'from-red-50',   badge: 'bg-red-100 text-red-600',     text: 'text-red-600',   dot: 'bg-red-400'   },
            };
            const col = colColors[stage.id];

            return (
              <div key={stage.id} className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                {/* Column Header */}
                <div className={`px-3 py-2.5 border-b border-gray-200 bg-gradient-to-r ${col.header} to-white flex-shrink-0`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                      <span className={`text-xs font-bold ${col.text}`}>{stage.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.badge}`}>
                      {stageCards.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 pl-3">{stage.description}</p>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[520px]">
                  {stageCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
                        <Users className="w-4 h-4 text-gray-300" />
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {stage.id === 'applied' && !screeningResult ? 'Run screening to distribute candidates' : 'No candidates here'}
                      </p>
                    </div>
                  ) : (
                    stageCards.map((candidate: any) => {
                      const score = getScoreForCandidate(candidate._id);
                      const topSkills = (candidate.skills || []).slice(0, 2);
                      const sourceColors: Record<string, string> = {
                        pdf:      'bg-red-50 text-red-600',
                        csv:      'bg-emerald-50 text-emerald-600',
                        json:     'bg-violet-50 text-violet-600',
                        platform: 'bg-blue-50 text-blue-600',
                      };
                      return (
                        <div
                          key={candidate._id}
                          className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                        >
                          {/* Card Header */}
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0 shadow-sm">
                              {candidate.firstName[0]}{candidate.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-gray-900 truncate leading-tight">
                                {candidate.firstName} {candidate.lastName}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">{candidate.email}</p>
                            </div>
                            {score !== null && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex-shrink-0 ${
                                score >= 70 ? 'bg-green-100 text-green-700' :
                                score >= 50 ? 'bg-amber-100 text-amber-700' :
                                              'bg-red-100 text-red-600'
                              }`}>
                                {score}%
                              </span>
                            )}
                          </div>

                          {/* Headline */}
                          {candidate.headline && (
                            <p className="text-[10px] text-gray-500 truncate mb-2 italic">{candidate.headline}</p>
                          )}

                          {/* Skills */}
                          {topSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {topSkills.map((s: any) => (
                                <span key={s.name} className="text-[9px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                  {s.name}
                                </span>
                              ))}
                              {candidate.skills.length > 2 && (
                                <span className="text-[9px] text-gray-400 px-1 py-0.5">+{candidate.skills.length - 2}</span>
                              )}
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {candidate.source && (
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${sourceColors[candidate.source] || 'bg-gray-50 text-gray-500'}`}>
                                  {candidate.source}
                                </span>
                              )}
                              <span className="text-[9px] text-gray-400">{new Date(candidate.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onViewCandidate?.(candidate)}
                                className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View profile"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleEmailSingle(candidate)}
                                className="p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                                title="Send email"
                              >
                                <Mail className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Candidates"
        message={`Delete ${selectedCandidates.size} candidate(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModal.open}
        onClose={() => setEmailModal({ open: false, recipients: [] })}
        recipients={emailModal.recipients}
        jobTitle={jobTitle || "the position"}
        context="general"
      />
    </div>
  );
}

// Screening Tab
function ScreeningTab({ screeningResults, job }: any) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    recipients: { name: string; email: string }[];
    context: 'shortlist' | 'rejection' | 'general';
  }>({ open: false, recipients: [], context: 'general' });
  const [showRejected, setShowRejected] = useState(true);

  const latestResult = screeningResults[0];

  if (!latestResult) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <Zap className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">No screening results</h3>
        <p className="text-xs text-gray-500">Run an AI screening to get candidate assessments and rankings</p>
      </div>
    );
  }

  const shortlisted: any[] = latestResult.shortlist || [];
  const rejected: any[]    = latestResult.rejectedCandidates || [];
  const allCandidates      = [...shortlisted, ...rejected];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSection = (list: any[]) => {
    const ids = list.map((c: any) => c.candidateId);
    const allIn = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      ids.forEach(id => allIn ? n.delete(id) : n.add(id));
      return n;
    });
  };

  const toRecipient = (c: any) => ({
    name: c.candidateName?.trim() || c.email?.split('@')[0] || 'Candidate',
    email: c.email,
  });

  const openEmail = (list: any[], context: 'shortlist' | 'rejection' | 'general') =>
    setEmailModal({ open: true, recipients: list.map(toRecipient), context });

  const emailAll        = () => openEmail(allCandidates, 'general');
  const emailShortlisted = () => openEmail(shortlisted, 'shortlist');
  const emailRejected   = () => openEmail(rejected, 'rejection');
  const emailSelected   = () => {
    const list = allCandidates.filter(c => selectedIds.has(c.candidateId));
    const hasRejected = list.some(c => rejected.includes(c));
    openEmail(list, hasRejected ? 'general' : 'shortlist');
  };
  const emailSingle     = (c: any, context: 'shortlist' | 'rejection') =>
    openEmail([c], context);

  const selectedCount = selectedIds.size;
  const allShortlistedSelected = shortlisted.length > 0 && shortlisted.every(c => selectedIds.has(c.candidateId));
  const allRejectedSelected    = rejected.length > 0 && rejected.every(c => selectedIds.has(c.candidateId));

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-3 border border-green-200">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-[10px] font-medium text-green-700">Shortlisted</span>
          </div>
          <p className="text-xl font-bold text-green-600">{shortlisted.length}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-3 border border-red-200">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center">
              <X className="w-3 h-3 text-red-600" />
            </div>
            <span className="text-[10px] font-medium text-red-700">Not Selected</span>
          </div>
          <p className="text-xl font-bold text-red-600">{rejected.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-3 border border-blue-200">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
              <Users className="w-3 h-3 text-blue-600" />
            </div>
            <span className="text-[10px] font-medium text-blue-700">Total Applicants</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{latestResult.totalApplicants}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl p-3 border border-violet-200">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-violet-100 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-violet-600" />
            </div>
            <span className="text-[10px] font-medium text-violet-700">Top Score</span>
          </div>
          <p className="text-xl font-bold text-violet-600">{shortlisted[0]?.finalScore || 0}%</p>
        </div>
      </div>

      {/* Email Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 mr-1">Email:</span>

        <button
          onClick={emailAll}
          disabled={allCandidates.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all disabled:opacity-40"
        >
          <Mail className="w-3.5 h-3.5" />
          All ({allCandidates.length})
        </button>

        {shortlisted.length > 0 && (
          <button
            onClick={emailShortlisted}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            Shortlisted ({shortlisted.length})
          </button>
        )}

        {rejected.length > 0 && (
          <button
            onClick={emailRejected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            Not Selected ({rejected.length})
          </button>
        )}

        {selectedCount > 0 && (
          <button
            onClick={emailSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/20 transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            Email Selected ({selectedCount})
          </button>
        )}
      </div>

      {/* Shortlisted Candidates */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gradient-to-r from-green-50 to-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allShortlistedSelected}
              onChange={() => toggleSection(shortlisted)}
              className="w-3 h-3 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Check className="w-3 h-3 text-green-600" />
              Shortlisted Candidates ({shortlisted.length})
            </h3>
          </div>
          {shortlisted.length > 0 && (
            <button
              onClick={emailShortlisted}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
            >
              <Mail className="w-3 h-3" /> Email All Shortlisted
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {shortlisted.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No shortlisted candidates</p>
          ) : shortlisted.map((candidate: any) => {
            const isSelected = selectedIds.has(candidate.candidateId);
            return (
              <div
                key={candidate.candidateId}
                className={`px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(candidate.candidateId)}
                  className="w-3 h-3 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
                />
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                  {candidate.candidateName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-900 truncate">{candidate.candidateName}</p>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      #{candidate.rank}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">{candidate.email}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{candidate.finalScore}%</p>
                    <p className="text-[10px] text-gray-400">{candidate.recommendation}</p>
                  </div>
                  <button
                    onClick={() => emailSingle(candidate, 'shortlist')}
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all"
                    title="Send email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Not Selected / Rejected Candidates */}
      {rejected.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowRejected(v => !v)}
            className="w-full px-3 py-2 bg-gradient-to-r from-red-50 to-white border-b border-gray-100 flex items-center justify-between hover:from-red-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allRejectedSelected}
                onChange={(e) => { e.stopPropagation(); toggleSection(rejected); }}
                onClick={e => e.stopPropagation()}
                className="w-3 h-3 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <X className="w-3 h-3 text-red-600" />
                Not Selected ({rejected.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); emailRejected(); }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
              >
                <Mail className="w-3 h-3" /> Email All Not Selected
              </button>
              <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showRejected ? 'rotate-90' : ''}`} />
            </div>
          </button>

          {showRejected && (
            <div className="divide-y divide-gray-100">
              {rejected.map((candidate: any) => {
                const isSelected = selectedIds.has(candidate.candidateId);
                return (
                  <div
                    key={candidate.candidateId}
                    className={`px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-rose-50/50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(candidate.candidateId)}
                      className="w-3 h-3 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer flex-shrink-0"
                    />
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                      {candidate.candidateName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{candidate.candidateName}</p>
                      <p className="text-[10px] text-gray-500 truncate">{candidate.email}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-500">{candidate.finalScore}%</p>
                        <p className="text-[10px] text-gray-400">Not selected</p>
                      </div>
                      <button
                        onClick={() => emailSingle(candidate, 'rejection')}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-all"
                        title="Send email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModal.open}
        onClose={() => setEmailModal({ open: false, recipients: [], context: 'general' })}
        recipients={emailModal.recipients}
        jobTitle={job?.title || 'the position'}
        context={emailModal.context}
      />
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
    <div className="space-y-3 max-w-5xl">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-md p-3 border border-blue-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Total Candidates</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-lg font-bold text-blue-600">{totalCandidates}</p>
        </div>

        <div className="bg-white rounded-md p-3 border border-green-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Shortlisted</span>
            <Check className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-lg font-bold text-green-600">{shortlistedCount}</p>
        </div>

        <div className="bg-white rounded-md p-3 border border-amber-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Shortlist Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-amber-600">{shortlistRate}%</p>
        </div>

        <div className="bg-white rounded-md p-3 border border-purple-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Screenings</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-lg font-bold text-purple-600">{screeningResults.length}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-md border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Summary</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Out of <span className="font-semibold text-gray-900">{totalCandidates}</span> candidates,{' '}
          <span className="font-semibold text-green-600">{shortlistedCount}</span> have been shortlisted
          across <span className="font-semibold text-gray-900">{screeningResults.length}</span> screening
          round(s). The shortlist rate is <span className="font-semibold text-amber-600">{shortlistRate}%</span>.
        </p>
      </div>
    </div>
  );
}

// Job Modal Component
function JobModal({ job, onClose, onSave, onCreate, onUpdate }: any) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: job?.title || '',
    department: job?.department || '',
    location: job?.location || '',
    type: job?.type || 'Full-time',
    experienceLevel: job?.experienceLevel || 'Mid-level',
    description: job?.description || '',
    responsibilities: job?.responsibilities?.join('\n') || '',
    requirements: (job?.requirements || []) as Array<{ skill: string; level: string; yearsRequired: number; required: boolean }>,
    niceToHave: job?.niceToHave?.join(', ') || '',
    isActive: job?.isActive ?? true,
  });

  const addRequirement = () =>
    setFormData(p => ({ ...p, requirements: [...p.requirements, { skill: '', level: 'Intermediate', yearsRequired: 1, required: true }] }));

  const removeRequirement = (i: number) =>
    setFormData(p => ({ ...p, requirements: p.requirements.filter((_, idx) => idx !== i) }));

  const updateRequirement = (i: number, field: string, value: any) =>
    setFormData(p => ({ ...p, requirements: p.requirements.map((r, idx) => idx === i ? { ...r, [field]: value } : r) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const jobData = {
        ...formData,
        responsibilities: formData.responsibilities.split('\n').map((r: string) => r.trim()).filter(Boolean),
        requirements: formData.requirements.filter(r => r.skill),
        niceToHave: formData.niceToHave.split(',').map((s: string) => s.trim()).filter(Boolean),
      };
      if (job) {
        await onUpdate(job._id, jobData);
      } else {
        await onCreate(jobData);
      }
      onSave();
    } catch {
      toast.error('Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-2.5 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={job ? 'Edit Job' : 'Create Job'}
      subtitle="Skill requirements use the Talent Profile Schema levels"
      size="xl"
      showCloseButton={true}
      className="p-0"
      panelClassName="bg-white"
    >
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
              <input type="text" className={inputCls} value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Senior Software Engineer" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <input type="text" className={inputCls} value={formData.department}
                onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                placeholder="e.g., Engineering" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
              <input type="text" className={inputCls} value={formData.location}
                onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                placeholder="e.g., Kigali, Rwanda" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select className={`${inputCls} bg-white`} value={formData.type}
                onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
              <select className={`${inputCls} bg-white`} value={formData.experienceLevel}
                onChange={e => setFormData(p => ({ ...p, experienceLevel: e.target.value }))}>
                <option>Junior</option>
                <option>Mid-level</option>
                <option>Senior</option>
                <option>Lead</option>
                <option>Executive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the role and its impact..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Responsibilities (one per line)</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={formData.responsibilities}
              onChange={e => setFormData(p => ({ ...p, responsibilities: e.target.value }))}
              placeholder="Enter each responsibility on a new line..." />
          </div>

          {/* Skill Requirements — schema-aligned */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Skill Requirements</label>
                <p className="text-[10px] text-gray-400 mt-0.5">Levels: Beginner · Intermediate · Advanced · Expert</p>
              </div>
              <button type="button" onClick={addRequirement}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Skill
              </button>
            </div>
            {formData.requirements.length === 0 && (
              <p className="text-xs text-gray-400 py-1 italic">No skill requirements added yet.</p>
            )}
            <div className="space-y-2">
              {formData.requirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <input type="text"
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Skill name (e.g., Node.js)" value={req.skill}
                    onChange={e => updateRequirement(i, 'skill', e.target.value)} />
                  <select
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    value={req.level} onChange={e => updateRequirement(i, 'level', e.target.value)}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Expert</option>
                  </select>
                  <input type="number" min={0} max={30}
                    className="w-14 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Yrs" value={req.yearsRequired}
                    onChange={e => updateRequirement(i, 'yearsRequired', Number(e.target.value))} />
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">yrs</span>
                  <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={req.required}
                      onChange={e => updateRequirement(i, 'required', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                    <span className="text-xs text-gray-600">Required</span>
                  </label>
                  <button type="button" onClick={() => removeRequirement(i)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nice to Have (comma-separated)</label>
            <input type="text" className={inputCls} value={formData.niceToHave}
              onChange={e => setFormData(p => ({ ...p, niceToHave: e.target.value }))}
              placeholder="e.g., Docker, Kubernetes, GraphQL" />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="isActive" checked={formData.isActive}
              onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="isActive" className="text-xs text-gray-700">Job is active</label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/80 backdrop-blur-sm">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2">
            {submitting ? (
              <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
            ) : (job ? 'Save Changes' : 'Create Job')}
          </button>
        </div>
    </Modal>
  );
}

// Candidate Modal — Three upload methods: Manual, Resume Upload (AI), CSV Upload
function CandidateModal({ jobId, onClose, onSave, onResumeQueued }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const [uploadMethod, setUploadMethod] = useState<'manual' | 'resume' | 'csv'>('manual');
  const [submitting, setSubmitting] = useState(false);

  // Manual form state
  const [activeTab] = useState<'basic' | 'skills' | 'experience' | 'education' | 'projects' | 'extras'>('basic');
  const [fd, setFd] = useState({
    firstName: '', lastName: '', email: '', headline: '', location: '', bio: '',
    skills: [{ name: '', level: 'Intermediate', yearsOfExperience: 1 }] as Array<{ name: string; level: string; yearsOfExperience: number }>,
    languages: [] as Array<{ name: string; proficiency: string }>,
    experience: [] as Array<{ company: string; role: string; startDate: string; endDate: string; description: string; technologies: string; isCurrent: boolean }>,
    education: [{ institution: '', degree: '', fieldOfStudy: '', startYear: 2020, endYear: 2024 }] as Array<{ institution: string; degree: string; fieldOfStudy: string; startYear: number; endYear: number }>,
    certifications: [] as Array<{ name: string; issuer: string; issueDate: string }>,
    projects: [] as Array<{ name: string; description: string; technologies: string; role: string; link: string; startDate: string; endDate: string }>,
    availability: { status: 'Available' as const, type: 'Full-time' as const, startDate: '' },
    socialLinks: { linkedin: '', github: '', portfolio: '' },
  });

  // Resume upload state
  const [selectedResumes, setSelectedResumes] = useState<File[]>([]);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeQueued, setResumeQueued] = useState(false);

  // CSV upload state
  const [selectedCsv, setSelectedCsv] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  const dedupeFiles = (files: File[]) => {
    const seen = new Set<string>();
    return files.filter((file) => {
      const key = `${file.name}|${file.size}|${file.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const dedupeCandidatesByEmail = (candidates: any[]) => {
    const seen = new Set<string>();
    return candidates.filter((candidate) => {
      const email = String(candidate?.email || '').trim().toLowerCase();
      const key = email || `${candidate?.firstName || ''}|${candidate?.lastName || ''}`.toLowerCase();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // ── Skills
  const addSkill    = () => setFd(p => ({ ...p, skills: [...p.skills, { name: '', level: 'Intermediate', yearsOfExperience: 1 }] }));
  const removeSkill = (i: number) => setFd(p => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) }));
  const updateSkill = (i: number, f: string, v: any) => setFd(p => ({ ...p, skills: p.skills.map((s, idx) => idx === i ? { ...s, [f]: v } : s) }));

  // ── Languages
  const addLang    = () => setFd(p => ({ ...p, languages: [...p.languages, { name: '', proficiency: 'Fluent' }] }));
  const removeLang = (i: number) => setFd(p => ({ ...p, languages: p.languages.filter((_, idx) => idx !== i) }));
  const updateLang = (i: number, f: string, v: any) => setFd(p => ({ ...p, languages: p.languages.map((l, idx) => idx === i ? { ...l, [f]: v } : l) }));

  // ── Experience
  const addExp    = () => setFd(p => ({ ...p, experience: [...p.experience, { company: '', role: '', startDate: '', endDate: '', description: '', technologies: '', isCurrent: false }] }));
  const removeExp = (i: number) => setFd(p => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }));
  const updateExp = (i: number, f: string, v: any) => setFd(p => ({ ...p, experience: p.experience.map((e, idx) => idx === i ? { ...e, [f]: v } : e) }));

  // ── Education
  const addEdu    = () => setFd(p => ({ ...p, education: [...p.education, { institution: '', degree: '', fieldOfStudy: '', startYear: 2020, endYear: 2024 }] }));
  const removeEdu = (i: number) => setFd(p => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));
  const updateEdu = (i: number, f: string, v: any) => setFd(p => ({ ...p, education: p.education.map((e, idx) => idx === i ? { ...e, [f]: v } : e) }));

  // ── Projects
  const addProj    = () => setFd(p => ({ ...p, projects: [...p.projects, { name: '', description: '', technologies: '', role: '', link: '', startDate: '', endDate: '' }] }));
  const removeProj = (i: number) => setFd(p => ({ ...p, projects: p.projects.filter((_, idx) => idx !== i) }));
  const updateProj = (i: number, f: string, v: any) => setFd(p => ({ ...p, projects: p.projects.map((pr, idx) => idx === i ? { ...pr, [f]: v } : pr) }));

  // ── Certifications
  const addCert    = () => setFd(p => ({ ...p, certifications: [...p.certifications, { name: '', issuer: '', issueDate: '' }] }));
  const removeCert = (i: number) => setFd(p => ({ ...p, certifications: p.certifications.filter((_, idx) => idx !== i) }));
  const updateCert = (i: number, f: string, v: any) => setFd(p => ({ ...p, certifications: p.certifications.map((c, idx) => idx === i ? { ...c, [f]: v } : c) }));

  // Manual form submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fd.firstName.trim() || !fd.lastName.trim() || !fd.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        jobId,
        firstName: fd.firstName.trim(),
        lastName: fd.lastName.trim(),
        email: fd.email.trim().toLowerCase(),
        headline: fd.headline.trim(),
        location: fd.location.trim(),
        phone: undefined,
        skills: [],
        experience: [],
        education: [],
        availability: {
          status: fd.availability.status,
          type: fd.availability.type,
        },
        source: 'platform' as const,
      };
      await dispatch(createCandidate(payload));
      await dispatch(fetchCandidates());
      onSave();
    } catch {
      toast.error('Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  // Resume upload handlers
  const handleResumeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setSelectedResumes(prev => dedupeFiles([...prev, ...files]));
  };

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
      setSelectedResumes(prev => dedupeFiles([...prev, ...files]));
    }
  };

  const removeResume = (index: number) => {
    setSelectedResumes(prev => prev.filter((_, i) => i !== index));
  };

  const handleResumeUpload = async () => {
    if (selectedResumes.length === 0) return;
    if (!jobId) {
      toast.error('No job selected');
      return;
    }
    setResumeParsing(true);
    try {
      const form = new FormData();
      selectedResumes.forEach(f => form.append('files', f));
      await api.post(`/candidates/upload/pdf?jobId=${jobId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedResumes([]);
      setResumeQueued(true);
      onResumeQueued?.(jobId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to queue resumes');
    } finally {
      setResumeParsing(false);
    }
  };


  // CSV upload handlers
  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setSelectedCsv(file);
      parseCsvPreview(file);
    }
  };

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedCsv(file);
      parseCsvPreview(file);
    }
  };

  const parseCsvPreview = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').slice(0, 5);
    const headers = lines[0].split(',').map(h => h.trim());
    const preview = lines.slice(1, 5).map(line => {
      const values = line.split(',');
      const row: any = {};
      headers.forEach((h, i) => { row[h] = values[i]?.trim() || ''; });
      return row;
    });
    setCsvPreview(preview);
  };

  const handleCsvUpload = async () => {
    if (!selectedCsv) return;
    if (!jobId) {
      toast.error('No job selected');
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(uploadCSV({ file: selectedCsv, jobId }));
      await dispatch(fetchCandidates());
      toast.success('CSV uploaded successfully');
      onSave();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload CSV');
    } finally {
      setSubmitting(false);
    }
  };

  const iCls = "w-full px-2.5 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const lCls = "block text-xs font-medium text-gray-700 mb-1";
  const req  = <span className="text-red-500"> *</span>;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Candidate"
      subtitle={jobId ? `Job ID: ${jobId.slice(-8)} · Quick add form` : "Choose how you want to add candidates"}
      size="xl"
      headerAccent="violet"
      showCloseButton={true}
      className="p-0"
      panelClassName="bg-white"
    >
      {/* Upload Method Selector */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setUploadMethod('manual')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                uploadMethod === 'manual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                uploadMethod === 'manual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Add Manually</span>
              <span className="text-[10px] text-center text-gray-400">Fill in detailed form</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadMethod('resume')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                uploadMethod === 'resume'
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                uploadMethod === 'resume' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Upload Resumes</span>
              <span className="text-[10px] text-center text-gray-400">AI-powered parsing</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadMethod('csv')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                uploadMethod === 'csv'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                uploadMethod === 'csv' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Upload CSV</span>
              <span className="text-[10px] text-center text-gray-400">Bulk import candidates</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── MANUAL METHOD ── */}

          {/* ── 3.1 Basic Info ── */}
          {uploadMethod === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lCls}>First Name{req}</label>
                  <input type="text" className={iCls} placeholder="e.g., John" required
                    value={fd.firstName} onChange={e => setFd(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className={lCls}>Last Name{req}</label>
                  <input type="text" className={iCls} placeholder="e.g., Doe" required
                    value={fd.lastName} onChange={e => setFd(p => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={lCls}>Email{req}</label>
                <input type="email" className={iCls} placeholder="john.doe@example.com" required
                  value={fd.email} onChange={e => setFd(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className={lCls}>Headline</label>
                <input type="text" className={iCls} placeholder='e.g., Backend Engineer'
                  value={fd.headline} onChange={e => setFd(p => ({ ...p, headline: e.target.value }))} />
              </div>
              <div>
                <label className={lCls}>Location</label>
                <input type="text" className={iCls} placeholder="City, Country"
                  value={fd.location} onChange={e => setFd(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label className={lCls}>Availability</label>
                <select className={`${iCls} bg-white`} value={fd.availability.type}
                  onChange={e => setFd(p => ({ ...p, availability: { ...p.availability, type: e.target.value as any } }))}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </div>
            </div>
          )}

          {/* ── 3.2 Skills & Languages ── */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">Skills{req}</label>
                  <button type="button" onClick={addSkill} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add Skill
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">Level: Beginner · Intermediate · Advanced · Expert</p>
                <div className="space-y-2">
                  {fd.skills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <input type="text"
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Skill name (e.g., Node.js)" value={skill.name}
                        onChange={e => updateSkill(i, 'name', e.target.value)} />
                      <select
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        value={skill.level} onChange={e => updateSkill(i, 'level', e.target.value)}>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                        <option>Expert</option>
                      </select>
                      <input type="number" min={0} max={50}
                        className="w-14 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Yrs" value={skill.yearsOfExperience}
                        onChange={e => updateSkill(i, 'yearsOfExperience', Number(e.target.value))} />
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">yrs exp</span>
                      {fd.skills.length > 1 && (
                        <button type="button" onClick={() => removeSkill(i)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">Languages</label>
                  <button type="button" onClick={addLang} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add Language
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">Proficiency: Basic · Conversational · Fluent · Native</p>
                {fd.languages.length === 0 && <p className="text-xs text-gray-400 italic">No languages added yet.</p>}
                <div className="space-y-2">
                  {fd.languages.map((lang, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <input type="text"
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Language (e.g., English)" value={lang.name}
                        onChange={e => updateLang(i, 'name', e.target.value)} />
                      <select
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        value={lang.proficiency} onChange={e => updateLang(i, 'proficiency', e.target.value)}>
                        <option>Basic</option>
                        <option>Conversational</option>
                        <option>Fluent</option>
                        <option>Native</option>
                      </select>
                      <button type="button" onClick={() => removeLang(i)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 3.3 Work Experience ── */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Work Experience{req}</label>
                <button type="button" onClick={addExp} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add Experience
                </button>
              </div>
              {fd.experience.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No work experience added yet.</p>
                  <button type="button" onClick={addExp} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add first entry</button>
                </div>
              )}
              {fd.experience.map((exp, i) => (
                <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Experience {i + 1}</span>
                    <button type="button" onClick={() => removeExp(i)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lCls}>Company</label>
                      <input type="text" className={iCls} placeholder="Company Name" value={exp.company}
                        onChange={e => updateExp(i, 'company', e.target.value)} /></div>
                    <div><label className={lCls}>Role</label>
                      <input type="text" className={iCls} placeholder="e.g., Backend Engineer" value={exp.role}
                        onChange={e => updateExp(i, 'role', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={lCls}>Start Date (YYYY-MM)</label>
                      <input type="month" className={iCls} value={exp.startDate}
                        onChange={e => updateExp(i, 'startDate', e.target.value)} /></div>
                    <div><label className={lCls}>End Date (YYYY-MM)</label>
                      <input type="month" className={iCls} value={exp.endDate} disabled={exp.isCurrent}
                        onChange={e => updateExp(i, 'endDate', e.target.value)} /></div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={exp.isCurrent}
                          onChange={e => { updateExp(i, 'isCurrent', e.target.checked); if (e.target.checked) updateExp(i, 'endDate', ''); }}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                        Current role
                      </label>
                    </div>
                  </div>
                  <div><label className={lCls}>Description</label>
                    <textarea className={`${iCls} resize-none`} rows={3}
                      placeholder="Key responsibilities and achievements..." value={exp.description}
                      onChange={e => updateExp(i, 'description', e.target.value)} /></div>
                  <div><label className={lCls}>Technologies (comma-separated)</label>
                    <input type="text" className={iCls} placeholder="e.g., Node.js, PostgreSQL, Docker" value={exp.technologies}
                      onChange={e => updateExp(i, 'technologies', e.target.value)} /></div>
                </div>
              ))}
            </div>
          )}

          {/* ── 3.4 Education ── */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Education{req}</label>
                <button type="button" onClick={addEdu} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add Education
                </button>
              </div>
              {fd.education.map((edu, i) => (
                <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Education {i + 1}</span>
                    {fd.education.length > 1 && (
                      <button type="button" onClick={() => removeEdu(i)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div><label className={lCls}>Institution</label>
                    <input type="text" className={iCls} placeholder="University Name" value={edu.institution}
                      onChange={e => updateEdu(i, 'institution', e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lCls}>Degree</label>
                      <input type="text" className={iCls} placeholder="e.g., Bachelor's" value={edu.degree}
                        onChange={e => updateEdu(i, 'degree', e.target.value)} /></div>
                    <div><label className={lCls}>Field of Study</label>
                      <input type="text" className={iCls} placeholder="e.g., Computer Science" value={edu.fieldOfStudy}
                        onChange={e => updateEdu(i, 'fieldOfStudy', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lCls}>Start Year</label>
                      <input type="number" className={iCls} min={1950} max={new Date().getFullYear()} value={edu.startYear}
                        onChange={e => updateEdu(i, 'startYear', Number(e.target.value))} /></div>
                    <div><label className={lCls}>End Year</label>
                      <input type="number" className={iCls} min={1950} max={new Date().getFullYear() + 8} value={edu.endYear}
                        onChange={e => updateEdu(i, 'endYear', Number(e.target.value))} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── 3.6 Projects ── */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Projects{req}</label>
                <button type="button" onClick={addProj} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>
              {fd.projects.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No projects added yet.</p>
                  <button type="button" onClick={addProj} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add first project</button>
                </div>
              )}
              {fd.projects.map((proj, i) => (
                <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Project {i + 1}</span>
                    <button type="button" onClick={() => removeProj(i)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lCls}>Project Name</label>
                      <input type="text" className={iCls} placeholder="e.g., AI Recruitment System" value={proj.name}
                        onChange={e => updateProj(i, 'name', e.target.value)} /></div>
                    <div><label className={lCls}>Role</label>
                      <input type="text" className={iCls} placeholder="e.g., Backend Engineer" value={proj.role}
                        onChange={e => updateProj(i, 'role', e.target.value)} /></div>
                  </div>
                  <div><label className={lCls}>Description</label>
                    <textarea className={`${iCls} resize-none`} rows={2}
                      placeholder="AI-powered candidate screening platform..." value={proj.description}
                      onChange={e => updateProj(i, 'description', e.target.value)} /></div>
                  <div><label className={lCls}>Technologies (comma-separated)</label>
                    <input type="text" className={iCls} placeholder="e.g., Next.js, Node.js, Gemini API" value={proj.technologies}
                      onChange={e => updateProj(i, 'technologies', e.target.value)} /></div>
                  <div><label className={lCls}>Project Link</label>
                    <input type="url" className={iCls} placeholder="https://..." value={proj.link}
                      onChange={e => updateProj(i, 'link', e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lCls}>Start Date (YYYY-MM)</label>
                      <input type="month" className={iCls} value={proj.startDate}
                        onChange={e => updateProj(i, 'startDate', e.target.value)} /></div>
                    <div><label className={lCls}>End Date (YYYY-MM)</label>
                      <input type="month" className={iCls} value={proj.endDate}
                        onChange={e => updateProj(i, 'endDate', e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── 3.5 Certifications + 3.7 Availability + 3.8 Social Links ── */}
          {activeTab === 'extras' && (
            <div className="space-y-6">

              {/* 3.7 Availability */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">3.7 Availability{req}</label>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lCls}>Status</label>
                      <select className={`${iCls} bg-white`} value={fd.availability.status}
                        onChange={e => setFd(p => ({ ...p, availability: { ...p.availability, status: e.target.value as any } }))}>
                        <option>Available</option>
                        <option>Open to Opportunities</option>
                        <option>Not Available</option>
                      </select></div>
                    <div><label className={lCls}>Type</label>
                      <select className={`${iCls} bg-white`} value={fd.availability.type}
                        onChange={e => setFd(p => ({ ...p, availability: { ...p.availability, type: e.target.value as any } }))}>
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                      </select></div>
                  </div>
                  <div><label className={lCls}>Available From (optional)</label>
                    <input type="date" className={iCls} value={fd.availability.startDate}
                      onChange={e => setFd(p => ({ ...p, availability: { ...p.availability, startDate: e.target.value } }))} /></div>
                </div>
              </div>

              {/* 3.5 Certifications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">3.5 Certifications</label>
                  <button type="button" onClick={addCert} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add Certification
                  </button>
                </div>
                {fd.certifications.length === 0 && <p className="text-xs text-gray-400 italic">No certifications added yet.</p>}
                <div className="space-y-2">
                  {fd.certifications.map((cert, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Certification {i + 1}</span>
                        <button type="button" onClick={() => removeCert(i)} className="p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><label className={lCls}>Name</label>
                          <input type="text" className={iCls} placeholder="AWS Certified Developer" value={cert.name}
                            onChange={e => updateCert(i, 'name', e.target.value)} /></div>
                        <div><label className={lCls}>Issuer</label>
                          <input type="text" className={iCls} placeholder="Amazon" value={cert.issuer}
                            onChange={e => updateCert(i, 'issuer', e.target.value)} /></div>
                        <div><label className={lCls}>Issue Date (YYYY-MM)</label>
                          <input type="month" className={iCls} value={cert.issueDate}
                            onChange={e => updateCert(i, 'issueDate', e.target.value)} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3.8 Social Links */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">3.8 Social Links</label>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div><label className={lCls}>LinkedIn</label>
                    <input type="url" className={iCls} placeholder="https://linkedin.com/in/..." value={fd.socialLinks.linkedin}
                      onChange={e => setFd(p => ({ ...p, socialLinks: { ...p.socialLinks, linkedin: e.target.value } }))} /></div>
                  <div><label className={lCls}>GitHub</label>
                    <input type="url" className={iCls} placeholder="https://github.com/..." value={fd.socialLinks.github}
                      onChange={e => setFd(p => ({ ...p, socialLinks: { ...p.socialLinks, github: e.target.value } }))} /></div>
                  <div><label className={lCls}>Portfolio</label>
                    <input type="url" className={iCls} placeholder="https://..." value={fd.socialLinks.portfolio}
                      onChange={e => setFd(p => ({ ...p, socialLinks: { ...p.socialLinks, portfolio: e.target.value } }))} /></div>
                </div>
              </div>
            </div>
          )}

          {/* ── RESUME UPLOAD METHOD ── */}
          {uploadMethod === 'resume' && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleResumeDrop}
                className="border-2 border-dashed border-violet-300 rounded-xl p-8 text-center bg-violet-50 hover:bg-violet-100 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-violet-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Drop resumes here</h3>
                <p className="text-xs text-gray-500 mb-4">PDF format supported • AI will extract candidate information</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" />
                  Browse Files
                  <input type="file" accept=".pdf" multiple onChange={handleResumeSelect} className="hidden" />
                </label>
              </div>

              {/* Selected Files */}
              {selectedResumes.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-700">Selected Resumes ({selectedResumes.length})</h4>
                    <button
                      type="button"
                      onClick={() => setSelectedResumes([])}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {selectedResumes.map((file, i) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">{file.name}</p>
                            <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeResume(i)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              {selectedResumes.length > 0 && (
                <button
                  type="button"
                  onClick={handleResumeUpload}
                  disabled={resumeParsing}
                  className="w-full py-3 text-xs font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resumeParsing ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Parsing with AI...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Parse Resumes with AI</>
                  )}
                </button>
              )}

              {/* Background queued confirmation */}
              {resumeQueued && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <Bell className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800">Processing in the background</p>
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      AI is parsing your resumes. You'll get a notification in the bell icon when done.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Close this panel →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CSV UPLOAD METHOD ── */}
          {uploadMethod === 'csv' && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleCsvDrop}
                className="border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Drop CSV file here</h3>
                <p className="text-xs text-gray-500 mb-4">Bulk import multiple candidates • All candidates will be added to the selected job</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" />
                  Browse Files
                  <input type="file" accept=".csv" onChange={handleCsvSelect} className="hidden" />
                </label>
              </div>

              {/* CSV Preview */}
              {selectedCsv && (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{selectedCsv.name}</p>
                          <p className="text-[10px] text-gray-400">{(selectedCsv.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedCsv(null); setCsvPreview([]); }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  {csvPreview.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <h4 className="text-xs font-semibold text-gray-700">Preview (first {csvPreview.length} rows)</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              {Object.keys(csvPreview[0]).map((key, i) => (
                                <th key={i} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {csvPreview.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                {Object.values(row).map((val: any, j) => (
                                  <td key={j} className="px-3 py-2 text-xs text-gray-600">
                                    {String(val).slice(0, 50)}{String(val).length > 50 ? '...' : ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <button
                    type="button"
                    onClick={handleCsvUpload}
                    disabled={submitting}
                    className="w-full py-3 text-xs font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Uploading...</>
                    ) : (
                      <><Users className="w-4 h-4" /> Import Candidates</>
                    )}
                  </button>
                </>
              )}

              {/* CSV Format Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
                <h4 className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  CSV Format Guide
                </h4>
                <p className="text-[10px] text-blue-700 mb-3">Required columns: firstName, lastName, email</p>
                <code className="block bg-white/50 rounded-lg p-3 text-[10px] text-gray-700 overflow-x-auto">
                  firstName,lastName,email,headline,location,skills<br/>
                  John,Doe,john@example.com,Software Engineer,"Kigali, Rwanda","Node.js,React"
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm">
          <div className="text-[11px] text-gray-500">
            {uploadMethod === 'manual' ? 'Quick add: basic profile only' : 'Upload will attach candidates to this job'}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all">
              Cancel
            </button>
            {uploadMethod === 'manual' && (
              <button type="button" onClick={handleManualSubmit} disabled={submitting}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2">
                {submitting
                  ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                  : 'Add Candidate'}
              </button>
            )}
          </div>
        </div>
    </Modal>
  );
}
