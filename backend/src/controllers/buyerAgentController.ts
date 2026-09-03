import type { NextFunction, Request, Response } from 'express';

import { BuyerAgent } from '../agents/buyerAgent.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class BuyerAgentController {
  constructor(private readonly agent = new BuyerAgent()) {}

  chat = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required');
      response.json(await this.agent.chat(request.user, request.body?.message, request.body?.action));
    } catch (error) {
      next(error);
    }
  };
}