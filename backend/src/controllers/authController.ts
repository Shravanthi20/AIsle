import type { NextFunction, Request, Response } from 'express';

import { AuthService } from '../services/authService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  register = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authResponse = await this.authService.register(request.body);
      response.status(httpStatus.created).json(authResponse);
    } catch (error) {
      next(error);
    }
  };

  login = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authResponse = await this.authService.login(request.body);
      response.status(httpStatus.ok).json(authResponse);
    } catch (error) {
      next(error);
    }
  };

  me = (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new HttpError(httpStatus.unauthorized, 'Authentication required'));
      return;
    }

    response.status(httpStatus.ok).json(this.authService.getCurrentUser(request.user));
  };

  logout = (_request: Request, response: Response): void => {
    response.status(httpStatus.ok).json({ status: 'ok' });
  };
}
