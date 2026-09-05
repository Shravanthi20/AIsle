import type { AgentCatalogProduct } from './agentCatalog.js';

export interface Recommendation extends Pick<
  AgentCatalogProduct,
  'product_id' | 'name' | 'price' | 'currency' | 'availability' | 'attributes'
> {
  score: number;
  reason: string;
  matched_requirements: string[];
  matched_preferences?: string[];
  tradeoffs: string[];
  confidence?: number;
}

export interface RecommendationResponse {
  query: string;
  recommendations: Recommendation[];
  message?: string;
}
