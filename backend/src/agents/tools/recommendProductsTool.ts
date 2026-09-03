import { RecommendationService } from '../../services/recommendationService.js';
import type { Recommendation } from '../../types/recommendation.js';

export class RecommendProductsTool {
  constructor(private readonly recommendations = new RecommendationService()) {}

  async execute(query: string): Promise<Recommendation[]> {
    return (await this.recommendations.recommend({ query, maxResults: 3 })).recommendations;
  }
}