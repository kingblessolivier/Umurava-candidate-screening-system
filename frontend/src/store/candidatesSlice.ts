import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import { Candidate } from "@/types";

export type ImportResult = { created: number; skipped: number; errors: string[] };
export type QueuedImportResult = { jobId: string; status: string; message: string };
export type UploadOutcome = ImportResult | QueuedImportResult;

interface CandidatesState { 
  items: Candidate[]; 
  total: number; 
  loading: boolean; 
  uploading: boolean; 
  error: string | null;
  searchQuery: string;
  page: number;
  limit: number;
}
const initialState: CandidatesState = { 
  items: [], 
  total: 0, 
  loading: false, 
  uploading: false, 
  error: null,
  searchQuery: "",
  page: 1,
  limit: 20,
};

export const fetchCandidates = createAsyncThunk("candidates/list",
  async (params?: { page?: number; limit?: number; search?: string; jobId?: string }) => {
    const { data } = await api.get<{ data: Candidate[]; total: number }>("/candidates", { params });
    return data;
  }
);

export const updateCandidate = createAsyncThunk("candidates/update", async ({ id, updates }: { id: string; updates: Partial<Candidate> }) => {
  const { data } = await api.put<{ data: Candidate }>(`/candidates/${id}`, updates);
  return data.data;
});

export const uploadCSV = createAsyncThunk("candidates/uploadCSV", async ({ file, jobId }: { file: File; jobId?: string }) => {
  const form = new FormData();
  form.append("file", file);
  const url = jobId ? `/candidates/upload/csv?jobId=${jobId}` : "/candidates/upload/csv";
  const { data } = await api.post<{ data: UploadOutcome }>(
    url, form, { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.data;
});

// Returns immediately with { jobId, status: 'pending' } — result arrives via SSE notification
export const uploadPDFs = createAsyncThunk(
  "candidates/uploadPDFs",
  async ({ files, jobId }: { files: File[]; jobId: string }) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const { data } = await api.post<{ data: { jobId: string; status: string; message: string } }>(
      `/candidates/upload/pdf?jobId=${encodeURIComponent(jobId)}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data.data;
  }
);

export const bulkImportJSON = createAsyncThunk("candidates/bulkJSON", async (profiles: Partial<Candidate>[]) => {
  const { data } = await api.post<{ data: UploadOutcome }>(
    "/candidates/bulk", profiles
  );
  return data.data;
});

export const createCandidate = createAsyncThunk("candidates/create", async (candidate: Partial<Candidate>) => {
  const { data } = await api.post<{ data: Candidate }>("/candidates", candidate);
  return data.data;
});

export const deleteCandidate = createAsyncThunk("candidates/delete", async (id: string) => {
  await api.delete(`/candidates/${id}`);
  return id;
});

const candidatesSlice = createSlice({
  name: "candidates",
  initialState,
  reducers: {
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
    b.addCase(fetchCandidates.pending,   (s) => { s.loading = true; s.error = null; })
     .addCase(fetchCandidates.fulfilled, (s, { payload }) => { s.loading = false; s.items = payload.data; s.total = payload.total; })
     .addCase(fetchCandidates.rejected,  (s, { error }) => { s.loading = false; s.error = error.message || "Failed"; })
     .addCase(updateCandidate.pending,   (s) => { s.loading = true; })
     .addCase(updateCandidate.fulfilled, (s, { payload }) => { 
       s.loading = false; 
       const index = s.items.findIndex(c => c._id === payload._id);
       if (index !== -1) s.items[index] = payload;
     })
     .addCase(updateCandidate.rejected,  (s, { error }) => { s.loading = false; s.error = error.message || "Update failed"; })
     .addCase(uploadCSV.pending,    (s) => { s.uploading = true; })
     .addCase(uploadCSV.fulfilled,  (s) => { s.uploading = false; })
     .addCase(uploadCSV.rejected,   (s, { error }) => { s.uploading = false; s.error = error.message || "Upload failed"; })
     .addCase(uploadPDFs.pending,   (s) => { s.uploading = true; })
     .addCase(uploadPDFs.fulfilled, (s) => { s.uploading = false; })
     .addCase(uploadPDFs.rejected,  (s, { error }) => { s.uploading = false; s.error = error.message || "Upload failed"; })
     .addCase(createCandidate.fulfilled, (s, { payload }) => { s.items.unshift(payload); s.total++; })
     .addCase(deleteCandidate.fulfilled, (s, { payload }) => { s.items = s.items.filter(c => c._id !== payload); s.total--; });
  },
});

export const { setSearchQuery, setPage, setLimit } = candidatesSlice.actions;
export default candidatesSlice.reducer;
