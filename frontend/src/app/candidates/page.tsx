'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Users,
  Search,
  Upload,
  Trash2,
  MapPin,
  Briefcase,
  Mail,
  LayoutList,
  LayoutGrid,
  Eye,
  Table2,
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
  const { candidates, total, loading, page, totalPages, handleSearch, handlePageChange, handleDeleteCandidate, handleUpdateCandidate } =
    useCandidates();
  const { items: jobs } = useSelector((state: RootState) => state.jobs);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'table'>('card');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Create a map of jobId -> job title for quick lookup
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
    <div className={cn(
      'gap-4',
      viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'
    )}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="flex items-start gap-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton width="70%" />
              <Skeleton width="50%" />
              <div className="flex gap-2 pt-2">
                <Skeleton width={60} height={20} className="rounded-full" />
                <Skeleton width={60} height={20} className="rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Candidates</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} candidate{total !== 1 ? 's' : ''} in pool
          </p>
        </div>
        <Button
          href="/candidates/upload"
          leftIcon={<Upload className="w-4 h-4" />}
        >
          Upload Candidates
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, email, or skill..."
          leftIcon={<Search className="w-4 h-4" />}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 max-w-lg"
        />

        {/* View Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('card')}
            className={cn(
              'p-2 rounded transition',
              viewMode === 'card'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            )}
            title="Card View"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded transition',
              viewMode === 'list'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            )}
            title="List View"
          >
            <LayoutList className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 rounded transition',
              viewMode === 'table'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            )}
            title="Table View"
          >
            <Table2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Candidates Display */}
      {loading ? (
        renderLoadingSkeleton()
      ) : candidates.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No candidates yet"
            description="Upload candidates from CSV, PDF, or JSON files to get started"
            action={{
              label: 'Upload Candidates',
              onClick: () => router.push('/candidates/upload'),
            }}
          />
        </Card>
      ) : viewMode === 'card' ? (
        // Card View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((candidate, index) => (
            <motion.div
              key={candidate._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card isHoverable className="overflow-hidden h-full flex flex-col">
                <div className="p-5 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar
                        name={`${candidate.firstName} ${candidate.lastName}`}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {candidate.firstName} {candidate.lastName}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{candidate.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Headline */}
                  {candidate.headline && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {candidate.headline}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-500">
                    {candidate.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {candidate.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {candidate.availability.type}
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {candidate.skills.slice(0, 3).map((skill) => (
                      <Badge
                        key={skill.name}
                        variant={SKILL_LEVEL_VARIANTS[skill.level]}
                        size="sm"
                      >
                        {skill.name}
                      </Badge>
                    ))}
                    {candidate.skills.length > 3 && (
                      <Badge variant="neutral" size="sm">
                        +{candidate.skills.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Source */}
                  <div className="mt-auto pt-3 border-t border-gray-200 space-y-2">
                    {/* Job */}
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600 font-medium">
                        {jobMap[candidate.jobId] || 'Job not found'}
                      </span>
                    </div>
                    {/* Source */}
                    <Badge variant="neutral" size="sm">
                      via {candidate.source || 'platform'}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleViewDetails(candidate)}
                      className="flex-1"
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(candidate._id, `${candidate.firstName} ${candidate.lastName}`)}
                      isLoading={deleteLoading === candidate._id}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        // List View
        <div className="space-y-3">
          {candidates.map((candidate, index) => (
            <motion.div
              key={candidate._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card isHoverable className="overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <Avatar
                    name={`${candidate.firstName} ${candidate.lastName}`}
                    size="lg"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 truncate">
                          {candidate.firstName} {candidate.lastName}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {candidate.email}
                          </span>
                          {candidate.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {candidate.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {candidate.availability.type}
                          </span>
                          <Badge variant="primary" size="sm">
                            {jobMap[candidate.jobId] || 'Job not found'}
                          </Badge>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 4).map((skill) => (
                          <Badge
                            key={skill.name}
                            variant={SKILL_LEVEL_VARIANTS[skill.level]}
                            size="sm"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                        {candidate.skills.length > 4 && (
                          <Badge variant="neutral" size="sm">
                            +{candidate.skills.length - 4}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleViewDetails(candidate)}
                          leftIcon={<Eye className="w-4 h-4" />}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(candidate._id, `${candidate.firstName} ${candidate.lastName}`)}
                          isLoading={deleteLoading === candidate._id}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
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
        // Table View
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Skills</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Availability</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, index) => (
                  <tr key={candidate._id} className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 transition',
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${candidate.firstName} ${candidate.lastName}`}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {candidate.firstName} {candidate.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{candidate.headline || 'No headline'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 truncate">
                      {candidate.email}
                    </td>
                    <td className="px-6 py-4">
                      {candidate.location ? (
                        <span className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                          {candidate.location}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 2).map((skill) => (
                          <Badge
                            key={skill.name}
                            variant={SKILL_LEVEL_VARIANTS[skill.level]}
                            size="sm"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                        {candidate.skills.length > 2 && (
                          <Badge variant="neutral" size="sm">
                            +{candidate.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={candidate.availability.status === 'available' ? 'success' : 'warning'} size="sm">
                        {candidate.availability.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(candidate)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(candidate._id, `${candidate.firstName} ${candidate.lastName}`)}
                          disabled={deleteLoading === candidate._id}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Pagination */}
      {candidates.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={loading}
          itemsPerPage={50}
          totalItems={total}
        />
      )}

      {/* Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdate={handleUpdateModal}
        isLoading={loading}
      />
    </div>
  );
}
