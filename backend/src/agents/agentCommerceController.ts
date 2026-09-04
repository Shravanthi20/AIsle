import type { NextFunction, Request, Response } from 'express';
import { AgentCommerceService } from './agentCommerceService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class AgentCommerceController {
  constructor(private readonly commerce = new AgentCommerceService()) {}

  query = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required');
      response.json(await this.commerce.query(request.user, request.body));
    } catch (error) {
      next(error);
    }
  };
}