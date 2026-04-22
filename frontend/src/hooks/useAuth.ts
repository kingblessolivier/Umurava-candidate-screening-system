'use client';

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { AppDispatch, RootState } from '@/store';
import { login, register, logout } from '@/store/authSlice';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, token, loading, error } = useSelector(
    (state: RootState) => state.auth
  );
  const isAuthenticated = !!token;

  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      const result = await dispatch(login(credentials));
      if (login.fulfilled.match(result)) {
        router.push('/');
      }
      return result;
    },
    [dispatch, router]
  );

  const handleRegister = useCallback(
    async (data: RegisterData) => {
      const result = await dispatch(register(data));
      if (register.fulfilled.match(result)) {
        router.push('/');
      }
      return result;
    },
    [dispatch, router]
  );

  const handleLogout = useCallback(() => {
    dispatch(logout());
    router.push('/login');
  }, [dispatch, router]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
  };
}
