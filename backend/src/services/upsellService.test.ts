import assert from 'node:assert/strict';
import test from 'node:test';
import { UpsellService } from './upsellService.js';
import type { AgentCatalogProduct } from '../types/agentCatalog.js';

const base: AgentCatalogProduct = { product_id: 'base', merchant_id: 'merchant', name: 'Base Laptop', description: 'coding laptop', category: 'Laptop', price: 70000, currency: 'INR', availability: 'IN_STOCK', stock: 5, status: 'ACTIVE', attributes: {}, use_cases: ['coding'] };
const better: AgentCatalogProduct = { ...base, product_id: 'better', name: 'Premium Laptop', price: 75000, attributes: { tier: 'premium' } };
const tooExpensive: AgentCatalogProduct = { ...base, product_id: 'too-expensive', name: 'Ultra Laptop', price: 90000 };

test('returns a better same-category product within the configured stretch', async () => {
  const service = new UpsellService({ retrieve: async () => [better, tooExpensive] } as never, { product: (product: AgentCatalogProduct) => ({ product, qualityScore: product.product_id === 'better' ? 0.8 : 0.5, useCases: product.use_cases, attributeTokens: [] }) } as never);
  const result = await service.recommend({ product: base, limit: 2 });
  assert.equal(result.length, 1);
  assert.equal(result[0]?.product.product_id, 'better');
  assert.equal(result[0]?.priceDifference, 5000);
});
