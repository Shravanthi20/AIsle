import { AgentCatalogService } from '../../services/agentCatalogService.js';
import { ProductSearchService, type SearchResult } from '../../services/productSearchService.js';
import type { BuyerRequirement } from '../../types/agentCommerce.js';

export class MerchantQueryTool {
  constructor(
    private readonly search = new ProductSearchService(),
    private readonly catalog = new AgentCatalogService(),
  ) {}

  async execute(merchantId: string, requirement: BuyerRequirement): Promise<SearchResult[]> {
    if (requirement.productId) {
      const product = await this.catalog.get(requirement.productId);
      return product.merchant_id === merchantId && product.price <= (requirement.budget ?? Number.POSITIVE_INFINITY) && product.stock >= requirement.quantity
        ? [{ ...product, match_score: 1, match_reasons: ['Requested product'] }]
        : [];
    }
    const result = await this.search.search({
      q: requirement.requirements,
      maxPrice: requirement.budget,
      attributes: requirement.attributes,
      inStock: 'true',
      limit: 50,
    });
    return result.results.filter((product) => product.merchant_id === merchantId && product.stock >= requirement.quantity);
  }
}