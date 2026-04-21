import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import { ScreeningResult, CandidateScore } from "@/types";
import { Thought } from "@/components/screening/ThinkingStream";

interface LiveScores {
  skills: number;
  experience: number;
  education: number;
  projects: number;
  availability: number;
}

interface ScreeningState {
  results: ScreeningResult[];
  current: ScreeningResult | null;
  running: boolean;
  loading: boolean;
  error: string | null;
  // Live screening state for "Thinking AI" UI
  thoughts: Thought[];
  liveScores: LiveScores;
  partialShortlist: CandidateScore[];
  evaluatedCount: number;
  totalCandidates: number;
  // Pagination
  total: number;
  page: number;
  limit: number;
  searchQuery: string;
}

const initialState: ScreeningState = {
  results: [],
  current: null,
  running: false,
  loading: false,
  error: null,
  thoughts: [],
  liveScores: { skills: 0, experience: 0, education: 0, projects: 0, availability: 0 },
  partialShortlist: [],
  evaluatedCount: 0,
  totalCandidates: 0,
  total: 0,
  page: 1,
  limit: 50,
  searchQuery: "",
};

export const runScreening = createAsyncThunk(
  "screening/run",
  async (payload: { jobId: string; shortlistSize: number; candidateIds?: string[] }) => {
    const { data } = await api.post<{ data: ScreeningResult }>("/screening/run", payload);
    return data.data;
  }
);

export const fetchResults = createAsyncThunk("screening/list", async (params?: { jobId?: string; page?: number; limit?: number; search?: string }) => {
  const { data } = await api.get<{ data: ScreeningResult[]; total: number }>("/screening", { params });
  return data;
});

export const fetchResult = createAsyncThunk("screening/get", async (id: string) => {
  const { data } = await api.get<{ data: ScreeningResult }>(`/screening/${id}`);
  return data.data;
});

export const fetchLatestForJob = createAsyncThunk("screening/latest", async (jobId: string) => {
  const { data } = await api.get<{ data: ScreeningResult }>(`/screening/job/${jobId}/latest`);
  return data.data;
});

export const deleteResult = createAsyncThunk("screening/delete", async (id: string) => {
  await api.delete(`/screening/${id}`);
  return id;
});

const screeningSlice = createSlice({
  name: "screening",
  initialState,
  reducers: {
    clearCurrent: (s) => { s.current = null; },
    // Live screening actions
    setTotalCandidates: (s, action: { payload: number }) => {
      s.totalCandidates = action.payload;
    },
    addThought: (s, action: { payload: Thought }) => {
      s.thoughts.push(action.payload);
      // Keep only last 50 thoughts to prevent memory bloat
      if (s.thoughts.length > 50) {
        s.thoughts = s.thoughts.slice(-50);
      }
    },
    addThoughts: (s, action: { payload: Thought[] }) => {
      s.thoughts.push(...action.payload);
      if (s.thoughts.length > 50) {
        s.thoughts = s.thoughts.slice(-50);
      }
    },
    clearThoughts: (s) => {
      s.thoughts = [];
    },
    updateLiveScores: (s, action: { payload: LiveScores }) => {
      s.liveScores = action.payload;
    },
    updatePartialShortlist: (s, action: { payload: CandidateScore[] }) => {
      s.partialShortlist = action.payload;
    },
    incrementEvaluatedCount: (s) => {
      s.evaluatedCount += 1;
    },
    resetLiveState: (s) => {
      s.thoughts = [];
      s.liveScores = { skills: 0, experience: 0, education: 0, projects: 0, availability: 0 };
      s.partialShortlist = [];
      s.evaluatedCount = 0;
      s.totalCandidates = 0;
    },
    // Pagination reducers
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.page = 1;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
    setLimit: (state, action) => {
      state.limit = action.payload;
      state.page = 1;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(runScreening.pending, (s) => {
        s.running = true;
        s.error = null;
        s.thoughts = [];
        s.partialShortlist = [];
        s.evaluatedCount = 0;
      })
      .addCase(runScreening.fulfilled, (s, { payload }) => {
        s.running = false;
        s.current = payload;
        s.results.unshift(payload);
        s.evaluatedCount = payload.totalApplicants;
      })
      .addCase(runScreening.rejected, (s, { error }) => {
        s.running = false;
        s.error = error.message || "Screening failed";
      })
      .addCase(fetchResults.pending, (s) => { s.loading = true; })
      .addCase(fetchResults.fulfilled, (s, { payload }) => { s.loading = false; s.results = payload.data; s.total = payload.total; })
      .addCase(fetchResults.rejected, (s, { error }) => { s.loading = false; s.error = error.message || "Failed"; })
      .addCase(fetchResult.pending, (s) => { s.loading = true; s.current = null; })
      .addCase(fetchResult.fulfilled, (s, { payload }) => { s.loading = false; s.current = payload; })
      .addCase(fetchResult.rejected, (s, { error }) => { s.loading = false; s.error = error.message || "Failed"; })
      .addCase(fetchLatestForJob.fulfilled, (s, { payload }) => { s.current = payload; })
      .addCase(deleteResult.fulfilled, (s, { payload }) => { s.results = s.results.filter(r => r._id !== payload); });
  },
});

export const {
  clearCurrent,
  setTotalCandidates,
  addThought,
  addThoughts,
  clearThoughts,
  updateLiveScores,
  updatePartialShortlist,
  incrementEvaluatedCount,
  resetLiveState,
  setSearchQuery,
  setPage,
  setLimit,
} = screeningSlice.actions;

export default screeningSlice.reducer;
