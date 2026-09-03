import type { UserRole } from './database.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  token: string;
}
