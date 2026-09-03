import { AuthRepository } from '../repositories/authRepository.js';
import type { AuthResponse, AuthenticatedUser } from '../types/auth.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { createAuthToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

interface RegisterInput {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  storeName?: unknown;
}

interface LoginInput {
  email?: unknown;
  password?: unknown;
}

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  async register(input: RegisterInput = {}): Promise<AuthResponse> {
    if (
      typeof input.name !== 'string' ||
      typeof input.email !== 'string' ||
      typeof input.password !== 'string'
    ) {
      throw new HttpError(
        httpStatus.badRequest,
        'Name, email, and an 8 character password are required',
      );
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (!name || !normalizedEmail || input.password.length < 8) {
      throw new HttpError(
        httpStatus.badRequest,
        'Name, email, and an 8 character password are required',
      );
    }

    if (input.role !== 'MERCHANT' && input.role !== 'BUYER') {
      throw new HttpError(httpStatus.badRequest, 'Role must be MERCHANT or BUYER');
    }

    const role = input.role;
    const existingUser = await this.authRepository.findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new HttpError(httpStatus.conflict, 'An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const merchantStoreName =
      role === 'MERCHANT'
        ? typeof input.storeName === 'string'
          ? input.storeName.trim() || `${name}'s Store`
          : `${name}'s Store`
        : undefined;
    const user = await this.authRepository.createUser(
      {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
      },
      merchantStoreName,
    );

    return this.createAuthResponse(user);
  }

  async login(input: LoginInput = {}): Promise<AuthResponse> {
    if (typeof input.email !== 'string' || typeof input.password !== 'string') {
      throw new HttpError(httpStatus.unauthorized, 'Invalid email or password');
    }

    const user = await this.authRepository.findUserByEmail(input.email.trim().toLowerCase());

    if (!user || !(await verifyPassword(input.password, user.password_hash))) {
      throw new HttpError(httpStatus.unauthorized, 'Invalid email or password');
    }

    return this.createAuthResponse(user);
  }

  getCurrentUser(user: AuthenticatedUser): { user: AuthenticatedUser } {
    return { user };
  }

  private createAuthResponse(user: AuthenticatedUser): AuthResponse {
    return {
      user,
      token: createAuthToken(user),
    };
  }
}
