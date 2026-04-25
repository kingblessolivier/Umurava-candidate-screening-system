'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, Search, Upload, Trash2, MapPin, Briefcase,
  Mail, LayoutGrid, Eye, Table2, UserPlus, X, Phone, ExternalLink,
  Filter, ChevronDown, Database,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppDispatch, RootState } from '@/store';
import { fetchJobs } from '@/store/jobsSlice';
import { api } from '@/lib/api';
import { useCandidates } from '@/hooks/useCandidates';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import { CreateCandidateModal } from '@/components/candidates/CreateCandidateModal';
import { CandidateUploadModal } from '@/components/candidates/CandidateUploadModal';
import { Skeleton } from '@/components/ui/LoadingState';
import { ConfirmModal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Candidate } from '@/types';
import { cn } from '@/lib/utils';

const SKILL_COLORS: Record<string, { bg: string; text: string }> = {
  Expert:       { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  Advanced:     { bg: 'bg-blue-50',     text: 'text-blue-700'    },
  Intermediate: { bg: 'bg-amber-50',    text: 'text-amber-700'   },
  Beginner:     { bg: 'bg-gray-100',    text: 'text-gray-600'    },
};

const SOURCE_LABELS: Record<string, string> = {
  csv: 'CSV Import', pdf: 'PDF Upload', json: 'JSON Import', platform: 'Manual Entry',
};

function SkillTag({ name, level }: { name: string; level: string }) {
  const c = SKILL_COLORS[level] ?? SKILL_COLORS.Beginner;
  return (
    <span className={cn('inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium border', c.bg, c.text, 'border-transparent')}>
      {name}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 select-none">
      {initials}
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [filterJobId, setFilterJobId] = useState('');
  const {
    candidates, total, loading, searchQuery, page, limit, totalPages,
    handleSearch, handlePageChange, handleLimitChange, refreshCandidates,
    handleDeleteCandidate, handleUpdateCandidate,
  } = useCandidates(filterJobId || undefined);

  const { items: jobs } = useSelector((state: RootState) => state.jobs);
  const [deleteLoading, setDeleteLoading]     = useState<string | null>(null);
  const [viewMode, setViewMode]               = useState<'card' | 'table'>('table');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [modalOpen, setModalOpen]             = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ scope: 'selected' | 'all'; count: number } | null>(null);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  useEffect(() => { if (jobs.length === 0) dispatch(fetchJobs()); }, [dispatch, jobs.length]);
  useEffect(() => { setSelectedIds(new Set()); }, [filterJobId, searchQuery, page, viewMode]);

  const jobMap = useMemo(() =>
    jobs.reduce((acc, j) => { acc[j._id!] = j.title; return acc; }, {} as Record<string, string>),
  [jobs]);

  const toggleSelect = (id: string, checked: boolean) =>
    setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });

  const toggleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(candidates.map(c => c._id)) : new Set());

  const getAllIds = async () => {
    const res = await api.get('/candidates', { params: { page: 1, limit: 100, search: searchQuery || undefined, jobId: filterJobId || undefined } });
    const all = [...(res.data.data || [])];
    const pages = Math.max(1, Math.ceil((res.data.total || 0) / 100));
    for (let p = 2; p <= pages; p++) {
      const r = await api.get('/candidates', { params: { page: p, limit: 100, search: searchQuery || undefined, jobId: filterJobId || undefined } });
      all.push(...(r.data.data || []));
    }
    return all.map((c: Candidate) => c._id).filter(Boolean);
  };

  const deleteCandidateIds = async (ids: string[]) => {
    if (!ids.length) return;
    const t = toast.loading(`Deleting ${ids.length} candidate${ids.length > 1 ? 's' : ''}…`);
    try {
      await Promise.all(ids.map(id => handleDeleteCandidate(id).unwrap()));
      await refreshCandidates();
      setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      toast.success(`Deleted ${ids.length} candidate${ids.length > 1 ? 's' : ''}`);
    } catch { toast.error('Failed to delete candidates'); }
    finally { toast.dismiss(t); }
  };

  const onDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(confirmDelete.id);
    setConfirmDelete(null);
    try {
      const r = await handleDeleteCandidate(confirmDelete.id);
      if (r.meta.requestStatus === 'fulfilled') {
        toast.success(`${confirmDelete.name} removed`);
        if (selectedCandidate?._id === confirmDelete.id) setModalOpen(false);
      } else toast.error('Failed to remove candidate');
    } catch { toast.error('Failed to remove candidate'); }
    finally { setDeleteLoading(null); }
  };

  const confirmBulkDelete = async () => {
    if (!bulkDeleteConfirm) return;
    setBulkDeleteLoading(true);
    try {
      const ids = bulkDeleteConfirm.scope === 'selected' ? Array.from(selectedIds) : await getAllIds();
      await deleteCandidateIds(ids);
      setSelectedIds(new Set());
    } finally { setBulkDeleteLoading(false); setBulkDeleteConfirm(null); }
  };

  const handleViewDetails = (c: Candidate) => { setSelectedCandidate(c); setModalOpen(true); };
  const handleUpdateModal = (id: string, updates: Partial<Candidate>) =>
    handleUpdateCandidate(id, updates).then(r => {
      if (r.meta?.requestStatus === 'fulfilled') setSelectedCandidate(r.payload as Candidate);
      return r;
    });

  const hasFilters = !!(searchQuery || filterJobId);
  const allSelected = candidates.length > 0 && selectedIds.size === candidates.length;

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  const renderSkeleton = () => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="flex-1 space-y-1.5">
              <Skeleton width="30%" height={14} />
              <Skeleton width="20%" height={12} />
            </div>
            <Skeleton width="18%" height={12} />
            <Skeleton width="15%" height={12} />
            <div className="flex gap-1.5">
              <Skeleton width={48} height={28} />
              <Skeleton width={28} height={28} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Candidate Registry</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Database className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {loading ? 'Loading…' : (
                    <><span className="font-semibold text-gray-700">{total.toLocaleString()}</span> candidate{total !== 1 ? 's' : ''} in pool</>
                  )}
                </span>
                {hasFilters && !loading && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-px rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100">
                    <Filter className="w-2.5 h-2.5" /> Filtered
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Candidate
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Candidates
            </button>
          </div>
        </div>

        {/* ── Filters bar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, or skill…"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Job filter */}
          <div className="relative">
            <select
              value={filterJobId}
              onChange={e => { setFilterJobId(e.target.value); handlePageChange(1); }}
              className="appearance-none pl-3 pr-7 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer min-w-[150px]"
            >
              <option value="">All Positions</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {hasFilters && (
            <button
              onClick={() => { handleSearch(''); setFilterJobId(''); handlePageChange(1); }}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden bg-white shadow-sm">
            {([
              { mode: 'table', Icon: Table2,     title: 'Table view' },
              { mode: 'card',  Icon: LayoutGrid, title: 'Card view'  },
            ] as const).map(({ mode, Icon, title }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={title}
                className={cn(
                  'px-2.5 py-2 transition flex items-center justify-center',
                  viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Bulk action bar ──────────────────────────────────────────────────── */}
        {candidates.length > 0 && (
          <div className={cn(
            'flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-all',
            selectedIds.size > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
          )}>
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={e => toggleSelectAll(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-gray-600">
                {selectedIds.size > 0
                  ? <><span className="font-semibold text-blue-700">{selectedIds.size}</span> of {candidates.length} selected</>
                  : <span className="text-gray-400">Select records to perform bulk actions</span>
                }
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setBulkDeleteConfirm({ scope: 'selected', count: selectedIds.size })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected ({selectedIds.size})
                </button>
              )}
              <button
                onClick={async () => {
                  const ids = await getAllIds();
                  if (!ids.length) { toast('No candidates to delete'); return; }
                  setBulkDeleteConfirm({ scope: 'all', count: ids.length });
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </button>
            </div>
          </div>
        )}

        {/* ── Content area ─────────────────────────────────────────────────────── */}
        {loading ? renderSkeleton() : candidates.length === 0 ? (

          /* Empty state */
          <div className="bg-white border border-gray-200 rounded-xl py-14 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {filterJobId ? 'No candidates for this position' : 'No candidates yet'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {filterJobId
                  ? 'Try selecting a different position or upload candidates.'
                  : 'Import candidates from CSV or PDF resumes to get started.'}
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" /> Import Candidates
            </button>
          </div>

        ) : viewMode === 'table' ? (

          /* ── Table view ────────────────────────────────────────────────────── */
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="pl-3 pr-2 py-2.5 w-9">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={e => toggleSelectAll(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Candidate</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Skills</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.map(c => (
                    <tr
                      key={c._id}
                      className={cn(
                        'hover:bg-blue-50/40 transition-colors',
                        selectedIds.has(c._id) && 'bg-blue-50'
                      )}
                    >
                      <td className="pl-3 pr-2 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c._id)}
                          onChange={e => toggleSelect(c._id, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={`${c.firstName} ${c.lastName}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                              {c.firstName} {c.lastName}
                            </p>
                            {c.headline && (
                              <p className="text-[11px] text-gray-500 truncate max-w-[180px]">{c.headline}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <div className="space-y-0.5">
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-gray-700 hover:text-blue-600 transition w-fit">
                            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{c.email}</span>
                          </a>
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 transition w-fit">
                              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />{c.phone}
                            </a>
                          )}
                          {c.socialLinks?.linkedin && (
                            <a href={c.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline w-fit"
                              onClick={e => e.stopPropagation()}>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" /> LinkedIn
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        {c.location ? (
                          <span className="flex items-center gap-1 text-xs text-gray-700 whitespace-nowrap">
                            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />{c.location}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {c.skills.slice(0, 3).map(s => (
                            <SkillTag key={s.name} name={s.name} level={s.level} />
                          ))}
                          {c.skills.length > 3 && (
                            <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                              +{c.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-1 text-xs text-gray-700 whitespace-nowrap">
                          <Briefcase className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[130px]">{jobMap[c.jobId] || <span className="text-gray-400">—</span>}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                          {SOURCE_LABELS[c.source || 'platform'] || c.source}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewDetails(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: c._id, name: `${c.firstName} ${c.lastName}` })}
                            disabled={deleteLoading === c._id}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition disabled:opacity-40"
                            title="Remove candidate"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        ) : (

          /* ── Card view ─────────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {candidates.map(c => (
              <div
                key={c._id}
                className={cn(
                  'bg-white border rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-md hover:-translate-y-0.5',
                  selectedIds.has(c._id) ? 'border-blue-300 shadow-blue-100 shadow-sm' : 'border-gray-200'
                )}
              >
                {/* Card header */}
                <div className="p-3 flex items-start gap-2.5 border-b border-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c._id)}
                    onChange={e => toggleSelect(c._id, e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                  />
                  <Avatar name={`${c.firstName} ${c.lastName}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                    {c.headline && <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{c.headline}</p>}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-3 flex-1 space-y-1.5">
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-[11px] text-gray-700 hover:text-blue-600 transition w-fit">
                    <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </a>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-blue-600 transition w-fit">
                      <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" /> {c.phone}
                    </a>
                  )}
                  {c.location && (
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" /> {c.location}
                    </span>
                  )}
                  {c.socialLinks?.linkedin && (
                    <a href={c.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:underline w-fit"
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" /> LinkedIn Profile
                    </a>
                  )}
                  {c.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {c.skills.slice(0, 4).map(s => <SkillTag key={s.name} name={s.name} level={s.level} />)}
                      {c.skills.length > 4 && (
                        <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                          +{c.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-3 pb-3 pt-2 border-t border-gray-100 mt-auto">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
                    <Briefcase className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate font-medium">{jobMap[c.jobId] || '—'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleViewDetails(c)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 text-[11px] font-semibold text-white hover:bg-blue-700 transition"
                    >
                      <Eye className="w-3 h-3" /> View Profile
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: c._id, name: `${c.firstName} ${c.lastName}` })}
                      disabled={deleteLoading === c._id}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition disabled:opacity-40"
                      title="Remove candidate"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────────────── */}
        {candidates.length > 0 && !loading && (
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={e => handleLimitChange(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      <CandidateDetailModal candidate={selectedCandidate} isOpen={modalOpen} onClose={() => setModalOpen(false)} onUpdate={handleUpdateModal} />
      <CreateCandidateModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <CandidateUploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} jobs={jobs} defaultJobId={filterJobId || undefined} onUploaded={refreshCandidates} />

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
            ? `Remove all ${bulkDeleteConfirm.count} candidate${bulkDeleteConfirm.count !== 1 ? 's' : ''} from the current filter? This cannot be undone.`
            : `Remove ${bulkDeleteConfirm?.count ?? 0} selected candidate${(bulkDeleteConfirm?.count ?? 0) !== 1 ? 's' : ''}? This cannot be undone.`
        }
        confirmLabel="Remove"
        variant="danger"
        isLoading={bulkDeleteLoading}
      />
    </div>
  );
}
