import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";

interface AuthUser { _id: string; name: string; email: string; role?: string; }
interface AuthState { user: AuthUser | null; token: string | null; loading: boolean; error: string | null; }

const getStoredToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("talentai_token") : null;
const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("talentai_user");
  return raw ? JSON.parse(raw) : null;
};

const initialState: AuthState = {
  user:    getStoredUser(),
  token:   getStoredToken(),
  loading: false,
  error:   null,
};

export const login = createAsyncThunk("auth/login", async (payload: { email: string; password: string }) => {
  const { data } = await api.post<{ success: boolean; data: { token: string; user: AuthUser } }>("/auth/login", payload);
  return data.data;
});

export const register = createAsyncThunk("auth/register", async (payload: { name: string; email: string; password: string }) => {
  const { data } = await api.post<{ success: boolean; data: { token: string; user: AuthUser } }>("/auth/register", payload);
  return data.data;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem("talentai_token");
      localStorage.removeItem("talentai_user");
    },
    setAuth(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user  = action.payload.user;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending,    (s) => { s.loading = true; s.error = null; })
      .addCase(login.fulfilled,  (s, { payload }) => {
        s.loading = false;
        s.token   = payload.token;
        s.user    = payload.user;
        localStorage.setItem("talentai_token", payload.token);
        localStorage.setItem("talentai_user",  JSON.stringify(payload.user));
      })
      .addCase(login.rejected,   (s, { error }) => { s.loading = false; s.error = error.message || "Login failed"; })
      .addCase(register.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(register.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.token   = payload.token;
        s.user    = payload.user;
        localStorage.setItem("talentai_token", payload.token);
        localStorage.setItem("talentai_user",  JSON.stringify(payload.user));
      })
      .addCase(register.rejected, (s, { error }) => { s.loading = false; s.error = error.message || "Registration failed"; });
  },
});

export const { logout, setAuth } = authSlice.actions;
export default authSlice.reducer;
