import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MerchantAgentService } from './merchantAgentService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const merchant: AuthenticatedUser = { id: 'merchant-user-2', name: 'Merchant', email: 'merchant@test', role: 'MERCHANT' };
const product = { id: 'product-1', merchantId: 'merchant-1', name: 'Runner', description: null, category: 'Shoes', price: '6999.00', currency: 'INR', stock: 3, imageUrl: null, status: 'ACTIVE' as const, attributes: [] };
const analytics = { totalOrders: 2, paidOrders: 1, revenue: 13998, currency: 'INR', topSellingProducts: [{ productId: product.id, name: product.name, category: product.category, status: product.status, stock: product.stock, currency: 'INR', unitsSold: 2, revenue: 13998, orderCount: 1 }], lowStockProducts: [product], inactiveProducts: [], underperformingProducts: [], productPerformance: [] };

test('merchant agent only answers from merchant tool data and suggests non-mutating actions', async () => {
  const service = new MerchantAgentService(
    { execute: async () => analytics } as never,
    { execute: async () => [product] } as never,
    { execute: async () => analytics.productPerformance } as never,
  );

  const response = await service.chat(merchant, 'Which products should I promote?');

  assert.equal(response.relevantProducts[0]?.name, 'Runner');
  assert.match(response.answer, /Runner/);
  assert.ok(response.suggestedActions.length > 0);
});

test('buyer cannot use the merchant agent', async () => {
  const service = new MerchantAgentService({} as never, {} as never, {} as never);
  await assert.rejects(
    service.chat({ id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' }, 'How are my products performing?'),
    { message: 'Merchant access required' },
  );
});