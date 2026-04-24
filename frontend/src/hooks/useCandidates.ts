'use client';

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import {
  fetchCandidates,
  deleteCandidate,
  updateCandidate,
  setSearchQuery,
  setPage,
  setLimit,
} from '@/store/candidatesSlice';
import { Candidate } from '@/types';

export function useCandidates(jobId?: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { items: candidates, total, loading, error, searchQuery, page, limit } = useSelector(
    (state: RootState) => state.candidates
  );

  useEffect(() => {
    dispatch(fetchCandidates({ page, limit, search: searchQuery || undefined, jobId }));
  }, [dispatch, searchQuery, page, limit, jobId]);

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

  const handleDeleteCandidate = useCallback(
    (id: string) => {
      return dispatch(deleteCandidate(id));
    },
    [dispatch]
  );

  const handleUpdateCandidate = useCallback(
    (id: string, updates: Partial<Candidate>) => {
      return dispatch(updateCandidate({ id, updates }));
    },
    [dispatch]
  );

  const refreshCandidates = useCallback(() => {
    dispatch(fetchCandidates({ page, limit, search: searchQuery || undefined, jobId }));
  }, [dispatch, page, limit, searchQuery, jobId]);

  const totalPages = Math.ceil(total / limit);

  return {
    candidates,
    total,
    loading,
    error,
    searchQuery,
    page,
    limit,
    totalPages,
    handleSearch,
    handlePageChange,
    handleLimitChange,
    handleDeleteCandidate,
    handleUpdateCandidate,
    refreshCandidates,
  };
}
