import type { NextFunction, Request, Response } from 'express';
import { MerchantAgent } from '../agents/merchantAgent.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class MerchantAgentController {
  constructor(private readonly agent = new MerchantAgent()) {}

  chat = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required');
      response.json(await this.agent.chat(request.user, request.body?.message));
    } catch (error) {
      next(error);
    }
  };
}