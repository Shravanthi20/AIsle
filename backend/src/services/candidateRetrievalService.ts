import { AgentCatalogService } from './agentCatalogService.js';
import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import type { CandidateRetriever } from '../types/commerceIntelligence.js';

export class CandidateRetrievalService implements CandidateRetriever {
  constructor(private readonly catalog = new AgentCatalogService()) {}

  async retrieve(input: { query?: string; category?: string; maxPrice?: number; excludeIds?: string[]; limit?: number }): Promise<AgentCatalogProduct[]> {
    const excluded = new Set(input.excludeIds ?? []);
    const query = input.query?.toLowerCase().split(/\s+/).filter((term) => term.length > 2) ?? [];
    return (await this.catalog.list())
      .filter((product) => !excluded.has(product.product_id) && product.availability === 'IN_STOCK')
      .filter((product) => input.category ? product.category.toLowerCase().includes(input.category.toLowerCase()) : true)
      .filter((product) => input.maxPrice === undefined || product.price <= input.maxPrice)
      .filter((product) => !query.length || query.some((term) => [product.name, product.category, product.description ?? '', ...Object.values(product.attributes)].join(' ').toLowerCase().includes(term)))
      .slice(0, input.limit ?? 50);
  }
}
