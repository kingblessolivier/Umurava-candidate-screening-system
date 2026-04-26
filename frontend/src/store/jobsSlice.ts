import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import { Job } from "@/types";

interface JobsState { 
  items: Job[]; 
  selected: Job | null; 
  loading: boolean; 
  error: string | null;
  total: number;
  page: number;
  limit: number;
  searchQuery: string;
}
const initialState: JobsState = { 
  items: [], 
  selected: null, 
  loading: false, 
  error: null,
  total: 0,
  page: 1,
  limit: 50,
  searchQuery: "",
};

export const fetchJobs = createAsyncThunk("jobs/list", async (params?: { page?: number; limit?: number; search?: string }) => {
  const { data } = await api.get<{ data: Job[]; total: number }>("/jobs", { params });
  return data;
});
export const fetchJob = createAsyncThunk("jobs/get", async (id: string) => {
  const { data } = await api.get<{ data: Job }>(`/jobs/${id}`);
  return data.data;
});
export const createJob = createAsyncThunk("jobs/create", async (payload: Partial<Job>) => {
  const { data } = await api.post<{ data: Job }>("/jobs", payload);
  return data.data;
});
export const updateJob = createAsyncThunk("jobs/update", async ({ id, ...payload }: Partial<Job> & { id: string }) => {
  const { data } = await api.put<{ data: Job }>(`/jobs/${id}`, payload);
  return data.data;
});
export const deleteJob = createAsyncThunk("jobs/delete", async (id: string) => {
  await api.delete(`/jobs/${id}`);
  return id;
});
export const enhanceJob = createAsyncThunk("jobs/enhance", async (payload: { title: string; description?: string }) => {
  const { data } = await api.post<{ data: unknown }>("/jobs/enhance", payload);
  return data.data;
});

const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: { 
    clearSelected: (s) => { s.selected = null; },
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
    b.addCase(fetchJobs.pending,    (s) => { s.loading = true; s.error = null; })
     .addCase(fetchJobs.fulfilled,  (s, { payload }) => { s.loading = false; s.items = payload.data; s.total = payload.total; })
     .addCase(fetchJobs.rejected,   (s, { error }) => { s.loading = false; s.error = error.message || "Failed"; })
     .addCase(fetchJob.pending,     (s) => { s.loading = true; s.selected = null; })
     .addCase(fetchJob.fulfilled,   (s, { payload }) => { s.loading = false; s.selected = payload; })
     .addCase(fetchJob.rejected,    (s, { error }) => { s.loading = false; s.error = error.message || "Failed"; })
     .addCase(createJob.fulfilled,  (s, { payload }) => { s.items.unshift(payload); })
     .addCase(updateJob.fulfilled,  (s, { payload }) => {
       const i = s.items.findIndex(j => j._id === payload._id);
       if (i !== -1) s.items[i] = payload;
       if (s.selected?._id === payload._id) s.selected = payload;
     })
     .addCase(deleteJob.fulfilled,  (s, { payload }) => { s.items = s.items.filter(j => j._id !== payload); });
  },
});

export const { clearSelected, setSearchQuery, setPage, setLimit } = jobsSlice.actions;
export default jobsSlice.reducer;
