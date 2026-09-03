import type { NextFunction, Request, Response } from 'express';

import { HttpError, httpStatus } from '../utils/http.js';
import { verifyAuthToken } from '../utils/jwt.js';

export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
  try {
    const authorizationHeader = request.header('authorization');
    const match = authorizationHeader?.match(/^Bearer\s+(\S+)$/i);
    const token = match?.[1];

    if (!token) {
      throw new HttpError(httpStatus.unauthorized, 'Authentication required');
    }

    request.user = verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
