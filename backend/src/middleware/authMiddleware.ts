import type { NextFunction, Request, Response } from 'express';

import type { UserRole } from '../types/database.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { verifyAuthToken } from '../utils/jwt.js';

export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
  try {
    const authorizationHeader = request.header('authorization');
    const [scheme, token] = authorizationHeader?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(httpStatus.unauthorized, 'Authentication required');
    }

    request.user = verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new HttpError(httpStatus.unauthorized, 'Authentication required'));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new HttpError(httpStatus.forbidden, 'You do not have access to this resource'));
      return;
    }

    next();
  };
}
