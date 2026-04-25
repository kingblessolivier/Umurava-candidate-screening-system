import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import { ScreeningResult, CandidateScore, ThinkingSnapshot } from "@/types";
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
  pendingBgJobId: string | null;
  loading: boolean;
  error: string | null;
  // Live screening state for "Thinking AI" UI
  thoughts: Thought[];
  thinkingLog: ThinkingSnapshot[]; // real Gemini reasoning snapshots — persists for review
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
  pendingBgJobId: null,
  loading: false,
  error: null,
  thoughts: [],
  thinkingLog: [],
  liveScores: { skills: 0, experience: 0, education: 0, projects: 0, availability: 0 },
  partialShortlist: [],
  evaluatedCount: 0,
  totalCandidates: 0,
  total: 0,
  page: 1,
  limit: 50,
  searchQuery: "",
};

// Returns immediately with { jobId, status: 'pending' } — result arrives via SSE notification
export const runScreening = createAsyncThunk(
  "screening/run",
  async (payload: { jobId: string; shortlistSize: number; candidateIds?: string[] }) => {
    const { data } = await api.post<{ data: { jobId: string; status: string; message: string } }>(
      "/screening/run",
      payload
    );
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
    upsertThought: (s, action: { payload: Thought }) => {
      const idx = s.thoughts.findIndex(t => t.id === action.payload.id);
      if (idx >= 0) {
        s.thoughts[idx] = { ...s.thoughts[idx], ...action.payload };
      } else {
        s.thoughts.push(action.payload);
        if (s.thoughts.length > 50) {
          s.thoughts = s.thoughts.slice(-50);
        }
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
      const byCandidateId = new Map<string, CandidateScore>();
      for (const candidate of action.payload) {
        const existing = byCandidateId.get(candidate.candidateId);
        if (!existing || candidate.finalScore > existing.finalScore) {
          byCandidateId.set(candidate.candidateId, candidate);
        }
      }
      s.partialShortlist = Array.from(byCandidateId.values()).sort((a, b) => {
        if ((a.rank ?? 0) !== (b.rank ?? 0)) return (a.rank ?? 0) - (b.rank ?? 0);
        return b.finalScore - a.finalScore;
      });
    },
    incrementEvaluatedCount: (s) => {
      s.evaluatedCount += 1;
    },
    setEvaluatedCount: (s, action: { payload: number }) => {
      s.evaluatedCount = action.payload;
    },
    addThinkingSnapshot: (s, action: { payload: ThinkingSnapshot }) => {
      s.thinkingLog.push(action.payload);
    },
    setThinkingLog: (s, action: { payload: ThinkingSnapshot[] }) => {
      s.thinkingLog = action.payload;
    },
    resetLiveState: (s) => {
      s.thoughts = [];
      s.thinkingLog = [];
      s.liveScores = { skills: 0, experience: 0, education: 0, projects: 0, availability: 0 };
      s.partialShortlist = [];
      s.evaluatedCount = 0;
      s.totalCandidates = 0;
    },
    // Called when the SSE notification arrives confirming the background job is done/failed
    stopRunning: (s) => {
      s.running = false;
      s.pendingBgJobId = null;
    },
    // Reattach UI to an already-running background screening job
    resumeRunning: (s, action: { payload: string }) => {
      s.running = true;
      s.pendingBgJobId = action.payload;
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
        s.pendingBgJobId = null;
        s.error = null;
        s.thoughts = [];
        s.thinkingLog = [];
        s.partialShortlist = [];
        s.evaluatedCount = 0;
      })
      .addCase(runScreening.fulfilled, (s, { payload }) => {
        // Background job accepted — running stays true until SSE notification arrives
        s.pendingBgJobId = payload.jobId;
      })
      .addCase(runScreening.rejected, (s, { error }) => {
        s.running = false;
        s.pendingBgJobId = null;
        s.error = error.message || "Screening failed";
      })
      .addCase(fetchResults.pending, (s) => { s.loading = true; })
      .addCase(fetchResults.fulfilled, (s, { payload }) => { s.loading = false; s.results = payload.data; s.total = payload.total; })
      .addCase(fetchResults.rejected, (s, { error }) => { s.loading = false; s.error = error.message || "Failed"; })
      .addCase(fetchResult.pending, (s) => { s.loading = true; s.current = null; })
      .addCase(fetchResult.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.current = payload;
        // Populate thinkingLog from stored result so review modal works on the results page
        if (payload.thinkingLog?.length) s.thinkingLog = payload.thinkingLog;
      })
      .addCase(fetchResult.rejected, (s, { error }) => { s.loading = false; s.error = error.message || "Failed"; })
      .addCase(fetchLatestForJob.fulfilled, (s, { payload }) => { s.current = payload; })
      .addCase(deleteResult.fulfilled, (s, { payload }) => { s.results = s.results.filter(r => r._id !== payload); });
  },
});

export const {
  clearCurrent,
  setTotalCandidates,
  addThought,
  upsertThought,
  addThoughts,
  clearThoughts,
  addThinkingSnapshot,
  setThinkingLog,
  updateLiveScores,
  updatePartialShortlist,
  incrementEvaluatedCount,
  setEvaluatedCount,
  resetLiveState,
  stopRunning,
  resumeRunning,
  setSearchQuery,
  setPage,
  setLimit,
} = screeningSlice.actions;

export default screeningSlice.reducer;
