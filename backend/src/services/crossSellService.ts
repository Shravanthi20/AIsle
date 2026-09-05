import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import type { CustomerContext, RankedCandidate } from '../types/commerceIntelligence.js';
import { CandidateRetrievalService } from './candidateRetrievalService.js';
import { CommerceContextService } from './commerceContextService.js';
import { ProductRelationshipRepository } from '../repositories/productRelationshipRepository.js';

export interface CrossSellInput {
  product: AgentCatalogProduct;
  customer?: CustomerContext;
  limit?: number;
}

export interface CrossSellRecommendation extends RankedCandidate {
  type: 'cross_sell';
  source: 'frequently_bought_together' | 'merchant_defined' | 'compatibility' | 'shared_use_case' | 'customer_history';
  confidence: number;
  reason: string;
}

export class CrossSellService {
  constructor(
    private readonly retrieval = new CandidateRetrievalService(),
    private readonly relationships = new ProductRelationshipRepository(),
    private readonly context = new CommerceContextService(),
  ) {}

  async recommend(input: CrossSellInput): Promise<CrossSellRecommendation[]> {
    const customer = input.customer ?? { purchasedProductIds: [], preferredCategories: [], preferredUseCases: [] };
    const related = await this.relationships.frequentlyBoughtTogether(input.product.product_id).catch(() => []);
    const coPurchase = new Map(related.map((item) => [item.relatedProductId, item.coPurchaseCount]));
    const candidates = await this.retrieval.retrieve({ excludeIds: [input.product.product_id, ...customer.purchasedProductIds], limit: 50 });
    const useCases = new Set(input.product.use_cases.map((item) => item.toLowerCase()));
    const results: CrossSellRecommendation[] = [];
    for (const product of candidates) {
      if (customer.purchasedProductIds.includes(product.product_id) || product.product_id === input.product.product_id || product.availability !== 'IN_STOCK') continue;
      const intelligence = this.context.product(product);
      const attributes = Object.entries(input.product.attributes);
      const merchantDefined = attributes.some(([key, value]) => /complement|related|accessory/i.test(key) && value.toLowerCase().includes(product.product_id.toLowerCase()));
      const compatibility = attributes.some(([key, value]) => /compatib/i.test(key) && value.toLowerCase().includes(product.category.toLowerCase()));
      const sharedUseCase = product.use_cases.some((item) => useCases.has(item.toLowerCase()));
      const count = coPurchase.get(product.product_id) ?? 0;
      if (!count && !merchantDefined && !compatibility && !sharedUseCase) continue;
      const source = count ? 'frequently_bought_together' : merchantDefined ? 'merchant_defined' : compatibility ? 'compatibility' : 'shared_use_case';
      const score = Math.min(1, 0.25 + Math.min(0.35, count * 0.08) + (merchantDefined ? 0.3 : 0) + (compatibility ? 0.25 : 0) + (sharedUseCase ? 0.15 : 0) + (intelligence.product.availability === 'IN_STOCK' ? 0.1 : 0));
      results.push({ product, score: Number(score.toFixed(2)), reasons: [source.replaceAll('_', ' ')], type: 'cross_sell', source, confidence: Number(Math.min(0.95, score + 0.05).toFixed(2)), reason: `Complements ${input.product.name} based on ${source.replaceAll('_', ' ')}.` });
    }
    return results.sort((left, right) => right.score - left.score || left.product.price - right.product.price).slice(0, input.limit ?? 3);
  }
}
