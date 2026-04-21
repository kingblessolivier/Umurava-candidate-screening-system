'use client';

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import {
  fetchJobs,
  createJob,
  updateJob,
  deleteJob,
  setSearchQuery,
  setPage,
  setLimit,
} from '@/store/jobsSlice';
import type { Job } from '@/types';

export function useJobs() {
  const dispatch = useDispatch<AppDispatch>();
  const { items: jobs, loading, error, searchQuery, total, page, limit } = useSelector(
    (state: RootState) => state.jobs
  );

  // Fetch jobs on mount and when pagination/search changes
  useEffect(() => {
    dispatch(fetchJobs({ page, limit, search: searchQuery || undefined }));
  }, [dispatch, page, limit, searchQuery]);

  const handleSearch = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      dispatch(setPage(newPage));
    },
    [dispatch]
  );

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      dispatch(setLimit(newLimit));
    },
    [dispatch]
  );

  const handleCreateJob = useCallback(
    async (jobData: Partial<Job>) => {
      const result = await dispatch(createJob(jobData));
      return result;
    },
    [dispatch]
  );

  const handleUpdateJob = useCallback(
    async (id: string, jobData: Partial<Job>) => {
      const result = await dispatch(updateJob({ id, ...jobData }));
      return result;
    },
    [dispatch]
  );

  const handleDeleteJob = useCallback(
    async (id: string) => {
      const result = await dispatch(deleteJob(id));
      return result;
    },
    [dispatch]
  );

  const totalPages = Math.ceil(total / limit);

  return {
    jobs,
    loading,
    error,
    searchQuery,
    total,
    page,
    limit,
    totalPages,
    handleSearch,
    handlePageChange,
    handleLimitChange,
    handleCreateJob,
    handleUpdateJob,
    handleDeleteJob,
  };
}
