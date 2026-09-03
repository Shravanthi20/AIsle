import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiGet, apiPost } from '../services/apiClient';
import type { AuthResponse, AuthenticatedUser } from '../types/auth';
import { AuthContext, type LoginInput, type RegisterInput } from './authContextValue';

const tokenStorageKey = 'aisle.authToken';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenStorageKey));
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const storeAuth = useCallback((authResponse: AuthResponse): AuthenticatedUser => {
    localStorage.setItem(tokenStorageKey, authResponse.token);
    setToken(authResponse.token);
    setUser(authResponse.user);
    return authResponse.user;
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiGet<{ user: AuthenticatedUser }>('/auth/me', token);

        if (isMounted) {
          setUser(response.user);
        }
      } catch {
        if (isMounted) {
          clearAuth();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [clearAuth, token]);

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthenticatedUser> => {
      const authResponse = await apiPost<AuthResponse>('/auth/register', input);
      return storeAuth(authResponse);
    },
    [storeAuth],
  );

  const login = useCallback(
    async (input: LoginInput): Promise<AuthenticatedUser> => {
      const authResponse = await apiPost<AuthResponse>('/auth/login', input);
      return storeAuth(authResponse);
    },
    [storeAuth],
  );

  const logout = useCallback(async (): Promise<void> => {
    if (token) {
      await apiPost('/auth/logout', undefined, token).catch(() => undefined);
    }

    clearAuth();
  }, [clearAuth, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      register,
      login,
      logout,
    }),
    [isLoading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
