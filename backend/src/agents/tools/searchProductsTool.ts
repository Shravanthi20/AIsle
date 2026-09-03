import { ProductSearchService, type SearchResult } from '../../services/productSearchService.js';

export interface SearchProductsInput {
  query: string;
  maxPrice?: number;
  attributes?: Record<string, string>;
}

export class SearchProductsTool {
  constructor(private readonly search = new ProductSearchService()) {}

  async execute(input: SearchProductsInput): Promise<SearchResult[]> {
    const result = await this.search.search({
      q: input.query,
      maxPrice: input.maxPrice?.toString(),
      attributes: input.attributes,
      inStock: 'true',
      limit: 20,
    });
    return result.results;
  }
}