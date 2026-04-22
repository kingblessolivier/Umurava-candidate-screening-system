'use client';

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchCandidates } from '@/store/candidatesSlice';

export function useJobCandidates(jobId: string | null) {
  const dispatch = useDispatch<AppDispatch>();
  const { items: candidates, total, loading, error } = useSelector(
    (state: RootState) => state.candidates
  );

  const refresh = useCallback(() => {
    if (jobId) {
      dispatch(fetchCandidates({ jobId, page: 1, limit: 100 }));
    }
  }, [dispatch, jobId]);

  useEffect(() => {
    if (jobId) {
      dispatch(fetchCandidates({ jobId, page: 1, limit: 100 }));
    }
  }, [dispatch, jobId]);

  return {
    candidates: jobId ? candidates : [],
    total: jobId ? total : 0,
    loading,
    error,
    refresh,
  };
}
