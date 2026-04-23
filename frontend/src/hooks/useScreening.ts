'use client';

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import {
  runScreening,
  fetchResults,
  fetchResult as fetchResultThunk,
  setTotalCandidates,
  addThought,
  addThoughts,
  clearThoughts,
  addThinkingSnapshot,
  updateLiveScores,
  updatePartialShortlist,
  incrementEvaluatedCount,
  setEvaluatedCount,
  resetLiveState,
} from '@/store/screeningSlice';
import { Thought } from '@/components/screening/ThinkingStream';
import { ThinkingSnapshot } from '@/types';

interface RunScreeningParams {
  jobId: string;
  shortlistSize?: number;
}

export function useScreening() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    results,
    current,
    running,
    loading,
    error,
    thoughts,
    thinkingLog,
    liveScores,
    partialShortlist,
    evaluatedCount,
    totalCandidates,
  } = useSelector((state: RootState) => state.screening);

  const handleRunScreening = useCallback(
    async ({ jobId, shortlistSize = 10 }: RunScreeningParams) => {
      const result = await dispatch(
        runScreening({ jobId, shortlistSize })
      );
      return result;
    },
    [dispatch]
  );

  const fetchAllResults = useCallback(() => {
    dispatch(fetchResults());
  }, [dispatch]);

  const fetchResult = useCallback(
    (id: string) => {
      dispatch(fetchResultThunk(id));
    },
    [dispatch]
  );

  // Live state actions
  const setTotalCandidatesCount = useCallback(
    (count: number) => {
      dispatch(setTotalCandidates(count));
    },
    [dispatch]
  );

  const addScreeningThought = useCallback(
    (thought: Thought) => {
      dispatch(addThought(thought));
    },
    [dispatch]
  );

  const addScreeningThoughts = useCallback(
    (thoughts: Thought[]) => {
      dispatch(addThoughts(thoughts));
    },
    [dispatch]
  );

  const clearScreeningThoughts = useCallback(() => {
    dispatch(clearThoughts());
  }, [dispatch]);

  const setLiveScores = useCallback(
    (scores: { skills: number; experience: number; education: number; projects: number; availability: number }) => {
      dispatch(updateLiveScores(scores));
    },
    [dispatch]
  );

  const setPartialShortlist = useCallback(
    (candidates: typeof partialShortlist) => {
      dispatch(updatePartialShortlist(candidates));
    },
    [dispatch]
  );

  const addThinkingSnapshotToLog = useCallback(
    (snapshot: ThinkingSnapshot) => {
      dispatch(addThinkingSnapshot(snapshot));
    },
    [dispatch]
  );

  const bumpEvaluatedCount = useCallback(() => {
    dispatch(incrementEvaluatedCount());
  }, [dispatch]);

  const setEvaluatedCountTo = useCallback(
    (count: number) => {
      dispatch(setEvaluatedCount(count));
    },
    [dispatch]
  );

  const resetLiveScreeningState = useCallback(() => {
    dispatch(resetLiveState());
  }, [dispatch]);

  return {
    results,
    current,
    running,
    loading,
    error,
    thoughts,
    thinkingLog,
    liveScores,
    partialShortlist,
    evaluatedCount,
    totalCandidates,
    handleRunScreening,
    fetchAllResults,
    fetchResult,
    setTotalCandidatesCount,
    addScreeningThought,
    addScreeningThoughts,
    clearScreeningThoughts,
    addThinkingSnapshotToLog,
    setLiveScores,
    setPartialShortlist,
    bumpEvaluatedCount,
    setEvaluatedCountTo,
    resetLiveScreeningState,
  };
}
