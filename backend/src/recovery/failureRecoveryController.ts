import type { NextFunction, Request, Response } from 'express';
import { FailureRecoveryService } from './failureRecoveryService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class FailureRecoveryController {
  constructor(private readonly service = new FailureRecoveryService()) {}
  private user(request: Request) { if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required'); return request.user; }
  retryPayment = async (request: Request, response: Response, next: NextFunction) => { try { response.json(await this.service.retryPayment(this.user(request), request.params.id ?? '')); } catch (error) { next(error); } };
  status = async (request: Request, response: Response, next: NextFunction) => { try { response.json(await this.service.status(this.user(request), request.params.id ?? '')); } catch (error) { next(error); } };
}