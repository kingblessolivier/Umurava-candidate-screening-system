'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchDashboardStats } from '@/store/analyticsSlice';

export function useDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { dashboard, loading, error } = useSelector(
    (state: RootState) => state.analytics
  );

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const refreshDashboard = () => {
    dispatch(fetchDashboardStats());
  };

  return {
    dashboard,
    loading,
    error,
    refreshDashboard,
  };
}
