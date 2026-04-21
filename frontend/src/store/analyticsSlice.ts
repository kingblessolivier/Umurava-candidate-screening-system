import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import { DashboardStats } from "@/types";

interface AnalyticsState { dashboard: DashboardStats | null; loading: boolean; error: string | null; }
const initialState: AnalyticsState = { dashboard: null, loading: false, error: null };

export const fetchDashboardStats = createAsyncThunk("analytics/dashboard", async () => {
  const { data } = await api.get<{ data: DashboardStats }>("/analytics/dashboard");
  return data.data;
});

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDashboardStats.pending,   (s) => { s.loading = true; s.error = null; })
     .addCase(fetchDashboardStats.fulfilled, (s, { payload }) => { s.loading = false; s.dashboard = payload; })
     .addCase(fetchDashboardStats.rejected,  (s, { error }) => { s.loading = false; s.error = error.message || "Failed"; });
  },
});

export default analyticsSlice.reducer;
