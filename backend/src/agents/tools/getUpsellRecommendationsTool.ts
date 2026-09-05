import { UpsellService, type UpsellRecommendation } from '../../services/upsellService.js';
import type { AgentCatalogProduct } from '../../types/agentCatalog.js';

export class GetUpsellRecommendationsTool {
  constructor(private readonly upsells = new UpsellService()) {}
  execute(product: AgentCatalogProduct): Promise<UpsellRecommendation[]> { return this.upsells.recommend({ product, limit: 2 }); }
}
