import type { NextFunction, Request, Response } from 'express';
import { AuditService } from './auditService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class AuditController {
  constructor(private readonly audits = new AuditService()) {}
  list = async (request: Request, response: Response, next: NextFunction): Promise<void> => { try { if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required'); response.json({ events: await this.audits.list(request.user, request.query.limit) }); } catch (error) { next(error); } };
}