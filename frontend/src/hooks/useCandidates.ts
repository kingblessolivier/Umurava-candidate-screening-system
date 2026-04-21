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

export function useCandidates() {
  const dispatch = useDispatch<AppDispatch>();
  const { items: candidates, total, loading, error, searchQuery, page, limit } = useSelector(
    (state: RootState) => state.candidates
  );

  useEffect(() => {
    dispatch(fetchCandidates({ page, limit, search: searchQuery || undefined }));
  }, [dispatch, searchQuery, page, limit]);

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
    async (id: string) => {
      const result = await dispatch(deleteCandidate(id));
      return result;
    },
    [dispatch]
  );

  const handleUpdateCandidate = useCallback(
    async (id: string, updates: Partial<Candidate>) => {
      const result = await dispatch(updateCandidate({ id, updates }));
      return result;
    },
    [dispatch]
  );

  const refreshCandidates = useCallback(() => {
    dispatch(fetchCandidates({ page, limit }));
  }, [dispatch, page, limit]);

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
