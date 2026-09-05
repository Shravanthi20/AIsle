import { ProductSearchService } from './productSearchService.js';
import type { Recommendation, RecommendationResponse } from '../types/recommendation.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { LlmIntentProvider } from '../agents/intentProvider.js';

interface RecommendationInput {
  query?: unknown;
  maxResults?: unknown;
}

export class RecommendationService {
  constructor(private readonly search = new ProductSearchService(), private readonly intents = new LlmIntentProvider()) {}

  async recommend(input: RecommendationInput = {}): Promise<RecommendationResponse> {
    if (typeof input.query !== 'string' || !input.query.trim())
      throw new HttpError(httpStatus.badRequest, 'A buyer requirement is required');
    const maxResults = input.maxResults === undefined ? 5 : Number(input.maxResults);
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 10)
      throw new HttpError(httpStatus.badRequest, 'maxResults must be between 1 and 10');
    const query = input.query.trim();
    const intent = await this.intents.understand(query);
    const searchQuery = intent.searchTerms.join(' ') || query;
    const strictCandidates = await this.search.search({
      q: searchQuery,
      minPrice: intent.minPrice?.toString(),
      maxPrice: intent.maxPrice?.toString(),
      attributes: intent.attributes,
      inStock: 'true',
      limit: 50,
      sort: 'relevance',
    });
    let candidates = strictCandidates.results;
    if (intent.maxPrice !== undefined && candidates.length < maxResults) {
      const relaxed = await this.search.search({
        q: searchQuery,
        minPrice: intent.minPrice?.toString(),
        maxPrice: (intent.maxPrice * 1.1).toString(),
        attributes: intent.attributes,
        inStock: 'true',
        limit: 50,
        sort: 'relevance',
      });
      candidates = [...new Map([...candidates, ...relaxed.results].map((candidate) => [candidate.product_id, candidate])).values()];
    }
    const recommendations = candidates
      .map((candidate) => {
        const matched = [...candidate.match_reasons];
        if (intent.maxPrice !== undefined)
          matched.unshift(
            candidate.price > intent.maxPrice
              ? `Within 10% of the ${candidate.currency} ${intent.maxPrice.toLocaleString('en-IN')} budget`
              : `Within ${candidate.currency} ${intent.maxPrice.toLocaleString('en-IN')} budget`,
          );
        const score = Math.min(1, candidate.match_score - (candidate.price > (intent.maxPrice ?? Number.POSITIVE_INFINITY) ? 0.08 : 0));
        return {
          product_id: candidate.product_id,
          name: candidate.name,
          price: candidate.price,
          currency: candidate.currency,
          availability: candidate.availability,
          attributes: candidate.attributes,
          score: Number(score.toFixed(2)),
          reason: `Recommended because it is ${candidate.currency} ${candidate.price.toLocaleString('en-IN')}, ${matched.slice(0, 3).join(', ').toLowerCase()}.`,
          matched_requirements: [...new Set(matched)],
          matched_preferences: Object.entries(intent.attributes).map(([key, value]) => `${key}: ${value}`),
          tradeoffs: [] as string[],
          confidence: Number(Math.min(0.98, intent.confidence * 0.7 + score * 0.3).toFixed(2)),
        } satisfies Recommendation;
      })
      .sort((a, b) => b.score - a.score || a.price - b.price)
      .slice(0, maxResults);
    if (recommendations.length > 1)
      recommendations.forEach((recommendation, index) => {
        const cheapest = Math.min(...recommendations.map((item) => item.price));
        if (recommendation.price > cheapest)
          recommendation.tradeoffs.push(
            `Costs ${recommendation.currency} ${(recommendation.price - cheapest).toLocaleString('en-IN')} more than the lowest-priced recommendation`,
          );
        if (index > 0) recommendation.tradeoffs.push('Lower-ranked than the best overall match');
      });
    return {
      query,
      recommendations,
      ...(recommendations.length
        ? {}
        : { message: 'No products currently match the requested requirements.' }),
    };
  }
}
