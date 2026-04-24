'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, Search, Upload, Trash2, MapPin, Briefcase,
  Mail, LayoutGrid, Eye, Table2, UserPlus, X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AppDispatch, RootState } from '@/store';
import { fetchJobs } from '@/store/jobsSlice';
import { api } from '@/lib/api';
import { useCandidates } from '@/hooks/useCandidates';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import { CreateCandidateModal } from '@/components/candidates/CreateCandidateModal';
import { CandidateUploadModal } from '@/components/candidates/CandidateUploadModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/LoadingState';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmModal } from '@/components/ui/Modal';
import { Candidate } from '@/types';
import { cn } from '@/lib/utils';

const SKILL_LEVEL_VARIANTS: Record<string, 'success' | 'primary' | 'warning' | 'neutral'> = {
  Expert: 'success',
  Advanced: 'primary',
  Intermediate: 'warning',
  Beginner: 'neutral',
};

export default function CandidatesPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [filterJobId, setFilterJobId] = useState<string>('');
  const {
    candidates,
    total,
    loading,
    searchQuery,
    page,
    limit,
    totalPages,
    handleSearch,
    handlePageChange,
    handleLimitChange,
    refreshCandidates,
    handleDeleteCandidate,
    handleUpdateCandidate,
  } = useCandidates(filterJobId || undefined);
  const { items: jobs } = useSelector((state: RootState) => state.jobs);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<null | { scope: 'selected' | 'all'; count: number }>(null);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  useEffect(() => {
    if (jobs.length === 0) dispatch(fetchJobs());
  }, [dispatch, jobs.length]);

  useEffect(() => {
    setSelectedCandidateIds(new Set());
  }, [filterJobId, searchQuery, page, viewMode]);

  const jobMap = useMemo(() => {
    return jobs.reduce((acc, job) => {
      acc[job._id!] = job.title;
      return acc;
    }, {} as Record<string, string>);
  }, [jobs]);

  const onDeleteRequest = (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const onDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setDeleteLoading(id);
    setConfirmDelete(null);
    try {
      const result = await handleDeleteCandidate(id);
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success(`${name} removed`);
        if (selectedCandidate?._id === id) setModalOpen(false);
      } else {
        toast.error('Failed to remove candidate');
      }
    } catch {
      toast.error('Failed to remove candidate');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleViewDetails = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setModalOpen(true);
  };

  const handleUpdateModal = (id: string, updates: Partial<Candidate>) => {
    return handleUpdateCandidate(id, updates).then((result) => {
      if (result.meta?.requestStatus === 'fulfilled') {
        setSelectedCandidate(result.payload as Candidate);
      }
      return result;
    });
  };

  const toggleCandidateSelection = (candidateId: string, checked: boolean) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(candidateId);
      else next.delete(candidateId);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedCandidateIds(() => {
      if (!checked) return new Set();
      return new Set(candidates.map((candidate) => candidate._id));
    });
  };

  const deleteCandidateIds = async (candidateIds: string[]) => {
    if (!candidateIds.length) return;

    const deletingToast = toast.loading(`Deleting ${candidateIds.length} candidate${candidateIds.length === 1 ? '' : 's'}...`);
    try {
      await Promise.all(candidateIds.map((id) => handleDeleteCandidate(id).unwrap()));
      await refreshCandidates();
      setSelectedCandidateIds((prev) => {
        const next = new Set(prev);
        candidateIds.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(`Deleted ${candidateIds.length} candidate${candidateIds.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Failed to delete selected candidates');
    } finally {
      toast.dismiss(deletingToast);
    }
  };

  const getAllCandidateIdsForCurrentFilter = async () => {
    const firstPage = await api.get('/candidates', {
      params: {
        page: 1,
        limit: 100,
        search: searchQuery || undefined,
        jobId: filterJobId || undefined,
      },
    });

    const totalCount = firstPage.data.total || 0;
    const totalPagesForFilter = Math.max(1, Math.ceil(totalCount / 100));
    const allCandidates = [...(firstPage.data.data || [])];

    for (let currentPage = 2; currentPage <= totalPagesForFilter; currentPage += 1) {
      const pageResponse = await api.get('/candidates', {
        params: {
          page: currentPage,
          limit: 100,
          search: searchQuery || undefined,
          jobId: filterJobId || undefined,
        },
      });
      allCandidates.push(...(pageResponse.data.data || []));
    }

    return allCandidates.map((candidate: Candidate) => candidate._id).filter(Boolean);
  };

  const handleBulkDelete = async () => {
    const candidateIds = Array.from(selectedCandidateIds);
    setBulkDeleteConfirm({ scope: 'selected', count: candidateIds.length });
    if (!candidateIds.length) return;
  };

  const handleDeleteAll = async () => {
    const candidateIds = await getAllCandidateIdsForCurrentFilter();
    if (!candidateIds.length) {
      toast('No candidates to delete');
      return;
    }
    setBulkDeleteConfirm({ scope: 'all', count: candidateIds.length });
  };

  const confirmBulkDelete = async () => {
    if (!bulkDeleteConfirm) return;
    setBulkDeleteLoading(true);
    try {
      const candidateIds =
        bulkDeleteConfirm.scope === 'selected'
          ? Array.from(selectedCandidateIds)
          : await getAllCandidateIdsForCurrentFilter();

      await deleteCandidateIds(candidateIds);
      setSelectedCandidateIds(new Set());
    } finally {
      setBulkDeleteLoading(false);
      setBulkDeleteConfirm(null);
    }
  };

  const renderLoadingSkeleton = () => (
    <div className={cn('gap-3', viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-2')}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-3">
          <div className="flex items-start gap-2">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="flex-1 space-y-1.5">
              <Skeleton width="70%" />
              <Skeleton width="50%" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton width={50} height={16} className="rounded-full" />
                <Skeleton width={50} height={16} className="rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-sm font-bold text-gray-900">Candidates</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} candidate{total !== 1 ? 's' : ''} in pool
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowCreateModal(true)} leftIcon={<UserPlus className="w-3.5 h-3.5" />} size="sm">
            Add Candidate
          </Button>
          <Button onClick={() => setShowUploadModal(true)} leftIcon={<Upload className="w-3.5 h-3.5" />} size="sm">
            Upload Candidates
          </Button>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Search by name, email, or skill..."
            leftIcon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 max-w-lg text-xs"
          />
          <select
            value={filterJobId}
            onChange={(e) => {
              setFilterJobId(e.target.value);
              handlePageChange(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
          {(searchQuery || filterJobId) && (
            <button
              onClick={() => {
                handleSearch('');
                setFilterJobId('');
                handlePageChange(1);
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
              title="Clear filters"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg w-fit">
          {([
            { mode: 'card',  Icon: LayoutGrid, title: 'Card View'  },
            { mode: 'table', Icon: Table2,     title: 'Table View' },
          ] as const).map(({ mode, Icon, title }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn('p-1.5 rounded transition', viewMode === mode ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900')}
              title={title}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {candidates.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>{selectedCandidateIds.size} selected</span>
            <span>{candidates.length} on this page</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleSelectAllVisible(selectedCandidateIds.size !== candidates.length)}
              leftIcon={<Users className="w-3.5 h-3.5" />}
            >
              {selectedCandidateIds.size === candidates.length ? 'Clear Selection' : 'Select All'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleBulkDelete}
              disabled={selectedCandidateIds.size === 0}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-red-600 hover:text-red-700"
            >
              Delete Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteAll}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-red-600 hover:text-red-700"
            >
              Delete All
            </Button>
          </div>
        </div>
      )}

      {/* Candidates Display */}
      {loading ? (
        renderLoadingSkeleton()
      ) : candidates.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={filterJobId ? "No candidates for this job" : "No candidates yet"}
            description={filterJobId ? "Try selecting a different job or assign candidates to this job" : "Upload candidates from CSV, PDF, or JSON files to get started"}
            action={{ label: "Upload Candidates", onClick: () => setShowUploadModal(true) }}
          />
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {candidates.map((candidate, index) => (
            <motion.div
              key={candidate._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card isHoverable className="overflow-hidden h-full flex flex-col">
                <div className="p-3 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCandidateIds.has(candidate._id)}
                      onChange={(e) => toggleCandidateSelection(candidate._id, e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar name={`${candidate.firstName} ${candidate.lastName}`} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {candidate.firstName} {candidate.lastName}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate">
                          <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{candidate.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {candidate.headline && (
                    <p className="text-[10px] text-gray-600 mb-2 line-clamp-2">{candidate.headline}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[10px] text-gray-500">
                    {candidate.location && (
                      <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{candidate.location}</span>
                    )}
                    <span className="flex items-center gap-0.5"><Briefcase className="w-2.5 h-2.5" />{candidate.availability.type}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {candidate.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill.name} variant={SKILL_LEVEL_VARIANTS[skill.level]} size="sm">{skill.name}</Badge>
                    ))}
                    {candidate.skills.length > 3 && (
                      <Badge variant="neutral" size="sm">+{candidate.skills.length - 3}</Badge>
                    )}
                  </div>

                  <div className="mt-auto pt-2 border-t border-gray-100 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] text-gray-600 font-medium truncate">
                        {jobMap[candidate.jobId] || 'Job not found'}
                      </span>
                    </div>
                    <Badge variant="neutral" size="sm">via {candidate.source || 'platform'}</Badge>
                  </div>

                  <div className="flex gap-1.5 mt-2">
                    <Button size="sm" variant="primary" onClick={() => handleViewDetails(candidate)} className="flex-1" leftIcon={<Eye className="w-3 h-3" />}>
                      View
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDeleteRequest(candidate._id, `${candidate.firstName} ${candidate.lastName}`)} isLoading={deleteLoading === candidate._id} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={candidates.length > 0 && selectedCandidateIds.size === candidates.length}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Select all candidates on this page"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Skills</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Availability</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, index) => (
                  <tr key={candidate._id} className={cn('border-b border-gray-100 hover:bg-gray-50 transition', index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedCandidateIds.has(candidate._id)}
                        onChange={(e) => toggleCandidateSelection(candidate._id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={`${candidate.firstName} ${candidate.lastName}`} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{candidate.firstName} {candidate.lastName}</p>
                          <p className="text-[10px] text-gray-500">{candidate.headline || 'No headline'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 truncate">{candidate.email}</td>
                    <td className="px-3 py-2">
                      {candidate.location ? (
                        <span className="flex items-center gap-1 text-xs text-gray-700">
                          <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />{candidate.location}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 2).map((skill) => (
                          <Badge key={skill.name} variant={SKILL_LEVEL_VARIANTS[skill.level]} size="sm">{skill.name}</Badge>
                        ))}
                        {candidate.skills.length > 2 && <Badge variant="neutral" size="sm">+{candidate.skills.length - 2}</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={candidate.availability.status === 'Available' ? 'success' : 'warning'} size="sm">
                        {candidate.availability.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleViewDetails(candidate)} className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteRequest(candidate._id, `${candidate.firstName} ${candidate.lastName}`)} disabled={deleteLoading === candidate._id} className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {candidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <label htmlFor="candidate-page-size" className="text-xs text-gray-600">Rows per page</label>
            <select
              id="candidate-page-size"
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={loading}
            itemsPerPage={limit}
            totalItems={total}
          />
        </div>
      )}

      <CandidateDetailModal candidate={selectedCandidate} isOpen={modalOpen} onClose={() => setModalOpen(false)} onUpdate={handleUpdateModal} />

      <CreateCandidateModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      <CandidateUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        jobs={jobs}
        defaultJobId={filterJobId || undefined}
        onUploaded={refreshCandidates}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={onDeleteConfirm}
        title="Remove Candidate"
        message={`Remove ${confirmDelete?.name}? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        isLoading={!!deleteLoading}
      />

      <ConfirmModal
        isOpen={!!bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(null)}
        onConfirm={confirmBulkDelete}
        title={bulkDeleteConfirm?.scope === 'all' ? 'Remove All Candidates' : 'Remove Selected Candidates'}
        message={
          bulkDeleteConfirm?.scope === 'all'
            ? `Remove all ${bulkDeleteConfirm.count} candidate${bulkDeleteConfirm.count === 1 ? '' : 's'} from the current filter? This cannot be undone.`
            : `Remove ${bulkDeleteConfirm?.count || 0} selected candidate${(bulkDeleteConfirm?.count || 0) === 1 ? '' : 's'}? This cannot be undone.`
        }
        confirmLabel="Remove"
        variant="danger"
        isLoading={bulkDeleteLoading}
      />
    </div>
  );
}
