import { AgentCatalogService } from '../../services/agentCatalogService.js';
import type { AgentCatalogProduct } from '../../types/agentCatalog.js';

export class ProductDetailsTool {
  constructor(private readonly catalog = new AgentCatalogService()) {}

  async execute(productId: string): Promise<AgentCatalogProduct> {
    return this.catalog.get(productId);
  }
}