import type { NextFunction, Request, Response } from 'express';
import { ApprovalService } from './approvalService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class ApprovalController {
  constructor(private readonly approvals = new ApprovalService()) {}
  private user(request: Request) { if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required'); return request.user; }
  create = async (request: Request, response: Response, next: NextFunction) => { try { response.status(httpStatus.created).json({ approval: await this.approvals.create(this.user(request), request.body?.action ?? 'PURCHASE') }); } catch (error) { next(error); } };
  list = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ approvals: await this.approvals.list(this.user(request)) }); } catch (error) { next(error); } };
  approve = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ approval: await this.approvals.approve(this.user(request), request.params.id ?? '') }); } catch (error) { next(error); } };
  reject = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ approval: await this.approvals.reject(this.user(request), request.params.id ?? '') }); } catch (error) { next(error); } };
}