import assert from 'node:assert/strict';
import test from 'node:test';
import { RecommendationService } from './recommendationService.js';
import type { SearchResult } from './productSearchService.js';

const products: SearchResult[] = Array.from({ length: 6 }, (_, index) => ({
  product_id: String(index + 1),
  merchant_id: 'merchant-1',
  name: `Black Silk Saree ${index + 1}`,
  description: 'Silk saree for festive wear',
  category: 'Sarees',
  price: 5000 + index * 500,
  currency: 'INR',
  availability: 'IN_STOCK',
  stock: 10,
  status: 'ACTIVE',
  attributes: { color: 'Black', material: 'Silk' },
  use_cases: ['festive wear'],
  match_score: 0.8 - index * 0.02,
  match_reasons: ['Matches product category'],
}));

function searchStub() {
  return {
    calls: [] as Array<Record<string, unknown>>,
    search: async (input: Record<string, unknown>) => {
      return { query: String(input.q ?? ''), results: products.filter((product) => input.maxPrice === undefined || product.price <= Number(input.maxPrice)), total: products.length, page: 1, limit: 50 };
    },
  };
}

test('returns five recommendations by default', async () => {
  const stub = searchStub();
  const service = new RecommendationService(stub as never, { understand: async () => ({ searchTerms: ['black', 'silk', 'saree'], attributes: { color: 'black', material: 'silk' }, maxPrice: undefined, minPrice: undefined, budgetFlexibility: 0, confidence: 0.9 }) } as never);
  const result = await service.recommend({ query: 'black silk saree' });
  assert.equal(result.recommendations.length, 5);
});

test('searches up to ten percent above budget when strict candidates are insufficient', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new RecommendationService({ search: async (input: Record<string, unknown>) => { calls.push(input); return { query: '', results: products.filter((product) => input.maxPrice === undefined || product.price <= Number(input.maxPrice)), total: 0, page: 1, limit: 50 }; } } as never, { understand: async () => ({ searchTerms: ['black', 'silk', 'saree'], attributes: {}, maxPrice: 5000, minPrice: undefined, budgetFlexibility: 0, confidence: 0.9 }) } as never);
  const result = await service.recommend({ query: 'black silk saree under 5000' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.maxPrice, '5500');
  assert.equal(result.recommendations.length, 2);
});
