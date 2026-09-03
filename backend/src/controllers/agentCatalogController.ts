import type { NextFunction, Request, Response } from 'express';
import { AgentCatalogService } from '../services/agentCatalogService.js';

export class AgentCatalogController {
  constructor(private readonly service = new AgentCatalogService()) {}

  list = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.json({ products: await this.service.list() });
    } catch (error) {
      next(error);
    }
  };

  get = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.json({ product: await this.service.get(request.params.productId ?? '') });
    } catch (error) {
      next(error);
    }
  };
}
