import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import type { CustomerContext, RankedCandidate } from '../types/commerceIntelligence.js';
import { CandidateRetrievalService } from './candidateRetrievalService.js';
import { CommerceContextService } from './commerceContextService.js';

export interface UpsellInput {
  product: AgentCatalogProduct;
  customer?: CustomerContext;
  budgetStretch?: number;
  limit?: number;
}

export interface UpsellRecommendation extends RankedCandidate {
  type: 'upsell';
  priceDifference: number;
  priceStretch: number;
  confidence: number;
  reason: string;
}

export class UpsellService {
  constructor(
    private readonly retrieval = new CandidateRetrievalService(),
    private readonly context = new CommerceContextService(),
  ) {}

  async recommend(input: UpsellInput): Promise<UpsellRecommendation[]> {
    const stretch = input.budgetStretch ?? 0.1;
    const candidates = await this.retrieval.retrieve({ category: input.product.category, excludeIds: [input.product.product_id], maxPrice: input.product.price * (1 + stretch), limit: 50 });
    const sourceUseCases = new Set(input.product.use_cases.map((item) => item.toLowerCase()));
    const customer = input.customer ?? { purchasedProductIds: [], preferredCategories: [], preferredUseCases: [] };
    const results: UpsellRecommendation[] = [];
    for (const product of candidates) {
      if (product.price <= input.product.price || product.price > input.product.price * (1 + stretch) || product.availability !== 'IN_STOCK') continue;
      const intelligence = this.context.product(product);
      const useCaseFit = product.use_cases.some((item) => sourceUseCases.has(item.toLowerCase())) ? 0.25 : 0;
      const qualityImprovement = Math.max(0, intelligence.qualityScore - 0.5) * 0.35;
      const customerFit = customer.preferredCategories.some((item) => item.toLowerCase() === product.category.toLowerCase()) ? 0.15 : 0;
      const priceStretch = (product.price - input.product.price) / input.product.price;
      const priceFit = Math.max(0, 0.25 - priceStretch);
      const score = Math.min(1, 0.25 + useCaseFit + qualityImprovement + customerFit + priceFit);
      results.push({ product, score: Number(score.toFixed(2)), reasons: ['Same category', ...(useCaseFit ? ['Matches the same use case'] : []), ...(qualityImprovement ? ['Higher quality or premium attributes'] : [])], type: 'upsell', priceDifference: product.price - input.product.price, priceStretch: Number(priceStretch.toFixed(3)), confidence: Number(Math.min(0.95, score + 0.1).toFixed(2)), reason: `A higher-value ${product.category} option${priceStretch > 0.05 ? ` for ${product.currency} ${(product.price - input.product.price).toLocaleString('en-IN')} more` : ''}.` });
    }
    return results.sort((left, right) => right.score - left.score || left.priceDifference - right.priceDifference).slice(0, input.limit ?? 2);
  }
}
