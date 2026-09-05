import { CrossSellService, type CrossSellRecommendation } from '../../services/crossSellService.js';
import type { AgentCatalogProduct } from '../../types/agentCatalog.js';

export class GetCrossSellRecommendationsTool {
  constructor(private readonly crossSells = new CrossSellService()) {}
  execute(product: AgentCatalogProduct): Promise<CrossSellRecommendation[]> { return this.crossSells.recommend({ product, limit: 3 }); }
}
