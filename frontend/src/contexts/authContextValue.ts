import { createContext } from 'react';

import type { AuthenticatedUser, UserRole } from '../types/auth';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  storeName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthContextValue {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  register: (input: RegisterInput) => Promise<AuthenticatedUser>;
  login: (input: LoginInput) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
