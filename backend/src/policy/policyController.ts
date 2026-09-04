import type { NextFunction, Request, Response } from 'express';
import { PolicyService } from './policyService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class PolicyController {
  constructor(private readonly policies = new PolicyService()) {}
  private user(request: Request) { if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required'); return request.user; }
  list = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ policies: await this.policies.list(this.user(request)) }); } catch (error) { next(error); } };
  create = async (request: Request, response: Response, next: NextFunction) => { try { response.status(httpStatus.created).json({ policy: await this.policies.create(this.user(request), request.body ?? {}) }); } catch (error) { next(error); } };
  update = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ policy: await this.policies.update(this.user(request), request.params.id ?? '', request.body ?? {}) }); } catch (error) { next(error); } };
}