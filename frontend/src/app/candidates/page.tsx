'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Users, Search, Upload, Trash2, MapPin, Briefcase,
  Mail, LayoutList, LayoutGrid, Eye, Table2, Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { RootState } from '@/store';
import { useCandidates } from '@/hooks/useCandidates';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/LoadingState';
import { Pagination } from '@/components/ui/Pagination';
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
  const [filterJobId, setFilterJobId] = useState<string>('');
  const { candidates, total, loading, page, totalPages, handleSearch, handlePageChange, handleDeleteCandidate, handleUpdateCandidate } =
    useCandidates(filterJobId || undefined);
  const { items: jobs } = useSelector((state: RootState) => state.jobs);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'table'>('card');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const jobMap = useMemo(() => {
    return jobs.reduce((acc, job) => {
      acc[job._id!] = job.title;
      return acc;
    }, {} as Record<string, string>);
  }, [jobs]);

  const onDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Remove ${name}? This action cannot be undone.`);
    if (!confirmed) return;
    setDeleteLoading(id);
    try {
      const result = await handleDeleteCandidate(id);
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Candidate removed');
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
        setSelectedCandidate(result.payload);
      }
      return result;
    });
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
        <Button href="/candidates/upload" leftIcon={<Upload className="w-3.5 h-3.5" />} size="sm">
          Upload Candidates
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Search by name, email, or skill..."
            leftIcon={<Search className="w-3.5 h-3.5" />}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 max-w-lg text-xs"
          />
          <select
            value={filterJobId}
            onChange={(e) => setFilterJobId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg w-fit">
          {([
            { mode: 'card',  Icon: LayoutGrid, title: 'Card View'  },
            { mode: 'list',  Icon: LayoutList, title: 'List View'  },
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

      {/* Candidates Display */}
      {loading ? (
        renderLoadingSkeleton()
      ) : candidates.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={filterJobId ? "No candidates for this job" : "No candidates yet"}
            description={filterJobId ? "Try selecting a different job or assign candidates to this job" : "Upload candidates from CSV, PDF, or JSON files to get started"}
            action={{ label: "Upload Candidates", onClick: () => router.push('/candidates/upload') }}
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
                  <div className="flex items-start justify-between mb-2">
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
                    <Button size="sm" variant="ghost" onClick={() => onDelete(candidate._id, `${candidate.firstName} ${candidate.lastName}`)} isLoading={deleteLoading === candidate._id} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {candidates.map((candidate, index) => (
            <motion.div
              key={candidate._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card isHoverable className="overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                  <Avatar name={`${candidate.firstName} ${candidate.lastName}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5">
                      <div>
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {candidate.firstName} {candidate.lastName}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                          <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{candidate.email}</span>
                          {candidate.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{candidate.location}</span>}
                          <span className="flex items-center gap-0.5"><Briefcase className="w-2.5 h-2.5" />{candidate.availability.type}</span>
                          <Badge variant="primary" size="sm">{jobMap[candidate.jobId] || 'Job not found'}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill.name} variant={SKILL_LEVEL_VARIANTS[skill.level]} size="sm">{skill.name}</Badge>
                        ))}
                        {candidate.skills.length > 4 && <Badge variant="neutral" size="sm">+{candidate.skills.length - 4}</Badge>}
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="primary" onClick={() => handleViewDetails(candidate)} leftIcon={<Eye className="w-3 h-3" />}>View</Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(candidate._id, `${candidate.firstName} ${candidate.lastName}`)} isLoading={deleteLoading === candidate._id} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
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
                      <Badge variant={candidate.availability.status === 'available' ? 'success' : 'warning'} size="sm">
                        {candidate.availability.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleViewDetails(candidate)} className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(candidate._id, `${candidate.firstName} ${candidate.lastName}`)} disabled={deleteLoading === candidate._id} className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50" title="Delete">
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
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} isLoading={loading} itemsPerPage={50} totalItems={total} />
      )}

      <CandidateDetailModal candidate={selectedCandidate} isOpen={modalOpen} onClose={() => setModalOpen(false)} onUpdate={handleUpdateModal} isLoading={loading} />
    </div>
  );
}
