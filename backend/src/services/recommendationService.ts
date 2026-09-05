import { ProductSearchService } from './productSearchService.js';
import type { Recommendation, RecommendationResponse } from '../types/recommendation.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { ShoppingIntentService } from './shoppingIntentService.js';

interface RecommendationInput {
  query?: unknown;
  maxResults?: unknown;
}
function budget(query: string): number | undefined {
  const match = query.match(/(?:under|below|less than|up to|within|around|₹|rs\.?|inr)\s*([\d,]+)/i);
  return match ? Number(match[1]?.replaceAll(',', '')) : undefined;
}

export class RecommendationService {
  constructor(private readonly search = new ProductSearchService(), private readonly intents = new ShoppingIntentService()) {}

  async recommend(input: RecommendationInput = {}): Promise<RecommendationResponse> {
    if (typeof input.query !== 'string' || !input.query.trim())
      throw new HttpError(httpStatus.badRequest, 'A buyer requirement is required');
    const maxResults = input.maxResults === undefined ? 3 : Number(input.maxResults);
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 10)
      throw new HttpError(httpStatus.badRequest, 'maxResults must be between 1 and 10');
    const query = input.query.trim();
    const intent = this.intents.parse(query);
    const parsedBudget = budget(query);
    const strictBudget = /\b(?:under|below|less than|up to|within)\b/i.test(query);
    const maxPrice = parsedBudget === undefined ? undefined : strictBudget ? parsedBudget : parsedBudget * (1 + intent.budgetFlexibility);
    const candidates = await this.search.search({
      q: query,
      maxPrice: maxPrice?.toString(),
      inStock: 'true',
      limit: 50,
      sort: 'relevance',
    });
    const recommendations = candidates.results
      .map((candidate) => {
        const matched = [...candidate.match_reasons];
        if (maxPrice !== undefined)
          matched.unshift(
            `Within ${candidate.currency} ${maxPrice.toLocaleString('en-IN')} budget`,
          );
        const useCaseMatch = candidate.use_cases.some((useCase) => query.toLowerCase().includes(useCase.toLowerCase()) || intent.useCases.some((item) => useCase.toLowerCase().includes(item)));
        if (useCaseMatch) matched.push(`Suitable for ${candidate.use_cases.join(', ')}`);
        const preferenceMatches = intent.preferredRequirements.filter((preference) => `${candidate.name} ${candidate.description ?? ''} ${Object.values(candidate.attributes).join(' ')}`.toLowerCase().includes(preference.toLowerCase()));
        const score = Math.min(1, candidate.match_score + (useCaseMatch ? 0.08 : 0) + Math.min(0.12, preferenceMatches.length * 0.06));
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
          matched_preferences: preferenceMatches,
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
