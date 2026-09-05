import { ProductSearchService, type SearchResult } from '../../services/productSearchService.js';

export interface SearchProductsInput {
  query: string;
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string>;
  sort?: 'price_asc' | 'price_desc';
}

export class SearchProductsTool {
  constructor(private readonly search = new ProductSearchService()) {}

  async execute(input: SearchProductsInput): Promise<SearchResult[]> {
    const result = await this.search.search({
      q: input.query,
      minPrice: input.minPrice?.toString(),
      maxPrice: input.maxPrice?.toString(),
      attributes: input.attributes,
      inStock: 'true',
      limit: 20,
      sort: input.sort,
    });
    return result.results;
  }
}