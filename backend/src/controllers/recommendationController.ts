import type { NextFunction, Request, Response } from 'express';
import { RecommendationService } from '../services/recommendationService.js';
export class RecommendationController {
  constructor(private readonly service = new RecommendationService()) {}
  recommend = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.json(await this.service.recommend(request.body));
    } catch (error) {
      next(error);
    }
  };
}
