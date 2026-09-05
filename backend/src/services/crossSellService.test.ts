import assert from 'node:assert/strict';
import test from 'node:test';
import { CrossSellService } from './crossSellService.js';
import type { AgentCatalogProduct } from '../types/agentCatalog.js';

const base: AgentCatalogProduct = { product_id: 'base', merchant_id: 'merchant', name: 'Camera', description: 'camera', category: 'Camera', price: 50000, currency: 'INR', availability: 'IN_STOCK', stock: 5, status: 'ACTIVE', attributes: {}, use_cases: ['photography'] };
const bag: AgentCatalogProduct = { ...base, product_id: 'bag', name: 'Camera Bag', category: 'Accessories', price: 3000, use_cases: ['photography'] };
const purchased: AgentCatalogProduct = { ...base, product_id: 'purchased', name: 'Already Bought', category: 'Accessories', price: 1000, use_cases: ['photography'] };

test('ranks co-purchased complementary products and excludes purchased products', async () => {
  const service = new CrossSellService({ retrieve: async () => [bag, purchased] } as never, { frequentlyBoughtTogether: async () => [{ productId: 'base', relatedProductId: 'bag', coPurchaseCount: 4 }, { productId: 'base', relatedProductId: 'purchased', coPurchaseCount: 8 }] } as never, { product: (product: AgentCatalogProduct) => ({ product, qualityScore: 0.5, useCases: product.use_cases, attributeTokens: [] }) } as never);
  const result = await service.recommend({ product: base, customer: { purchasedProductIds: ['purchased'], preferredCategories: [], preferredUseCases: [] } });
  assert.deepEqual(result.map((item) => item.product.product_id), ['bag']);
  assert.equal(result[0]?.source, 'frequently_bought_together');
});
