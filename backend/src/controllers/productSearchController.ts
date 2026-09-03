import type { NextFunction, Request, Response } from 'express';
import { ProductSearchService } from '../services/productSearchService.js';
export class ProductSearchController {
  constructor(private readonly service = new ProductSearchService()) {}
  list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.json(await this.service.search(request.query));
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
