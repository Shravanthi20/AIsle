import type { NextFunction, Request, Response } from 'express';

import type { UserRole } from '../types/database.js';
import { HttpError, httpStatus } from '../utils/http.js';

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
