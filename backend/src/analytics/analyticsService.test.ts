import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AnalyticsService } from './analyticsService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const merchant: AuthenticatedUser = { id: 'merchant-user-1', name: 'Merchant', email: 'merchant@test', role: 'MERCHANT' };

function repository() {
  return {
    merchantSummary: async () => ({ totalOrders: 3, confirmedCompletedOrders: 2, revenue: '10000.10', averageOrderValue: '5000.05', currency: 'INR', topSellingProducts: [], lowStockProducts: [], inactiveProducts: [], trends: [] }),
    merchantProducts: async () => [{ productId: 'product-1', name: 'Shoes', category: 'Shoes', status: 'ACTIVE' as const, stock: 2, price: '5000.05', currency: 'INR', quantitySold: 2, revenue: '10000.10' }],
    merchantOrders: async () => [], merchantTrends: async () => [{ date: '2026-01-01', orders: 2, revenue: '10000.10' }],
    buyerSummary: async () => ({ totalOrders: 2, totalSpending: '10000.10', currency: 'INR', mostPurchasedProducts: [], trends: [] }),
    buyerProducts: async () => [{ productId: 'product-1', name: 'Shoes', quantityPurchased: 2, spending: '10000.10', currency: 'INR' }],
    buyerOrders: async () => [], buyerTrends: async () => [{ date: '2026-01-01', orders: 2, revenue: '10000.10' }],
  };
}

test('merchant analytics preserves exact decimal money and date filters', async () => {
  const calls: unknown[] = [];
  const repositoryMock = repository();
  const service = new AnalyticsService({ ...repositoryMock, merchantSummary: async (id: string, dates: unknown) => { calls.push([id, dates]); return repositoryMock.merchantSummary(); } } as never, { getMerchantByUserId: async (id: string) => ({ id: 'merchant-1', userId: id }) } as never);
  const result = await service.merchant(merchant, { startDate: '2026-01-01', endDate: '2026-01-31' });
  assert.equal(result.revenue, '10000.10');
  assert.equal(result.averageOrderValue, '5000.05');
  assert.deepEqual(calls, [['merchant-1', { startDate: '2026-01-01', endDate: '2026-01-31' }]]);
  assert.equal(result.topSellingProducts[0]?.quantitySold, 2);
});

test('buyer analytics is isolated to buyer role and identity', async () => {
  let buyerId = '';
  const repositoryMock = repository();
  const service = new AnalyticsService({ ...repositoryMock, buyerSummary: async (id: string) => { buyerId = id; return repositoryMock.buyerSummary(); } } as never, {} as never);
  const result = await service.buyer(buyer, {});
  assert.equal(buyerId, buyer.id);
  assert.equal(result.totalSpending, '10000.10');
  await assert.rejects(service.buyer(merchant, {}), { message: 'Buyer access required' });
});

test('merchant analytics rejects buyers and invalid date ranges', async () => {
  const service = new AnalyticsService({} as never, {} as never);
  await assert.rejects(service.merchant(buyer, {}), { message: 'Merchant access required' });
  await assert.rejects(service.buyer(buyer, { startDate: '2026-02-01', endDate: '2026-01-01' }), { message: 'startDate must be before or equal to endDate' });
  await assert.rejects(service.buyer(buyer, { startDate: '01-01-2026' }), { message: 'Dates must use YYYY-MM-DD format' });
});