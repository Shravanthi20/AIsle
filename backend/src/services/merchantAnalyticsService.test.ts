import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MerchantAnalyticsService } from './merchantAnalyticsService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const merchant: AuthenticatedUser = { id: 'merchant-user', name: 'Merchant', email: 'merchant@test', role: 'MERCHANT' };
const product = { id: 'product-1', merchantId: 'merchant-1', name: 'Runner', description: null, category: 'Shoes', price: '6999.00', currency: 'INR', stock: 3, imageUrl: null, status: 'ACTIVE' as const, attributes: [] };
const inactive = { ...product, id: 'product-2', name: 'Old bag', status: 'INACTIVE' as const, stock: 20 };

test('merchant analytics uses the authenticated merchant and paid order values', async () => {
  let receivedUser: AuthenticatedUser | undefined;
  const service = new MerchantAnalyticsService(
    { list: async (user: AuthenticatedUser) => { receivedUser = user; return [product, inactive]; } } as never,
    { list: async () => [
      { id: 'order-1', merchantId: 'merchant-1', buyerId: 'buyer-1', totalAmount: '13998.00', currency: 'INR', status: 'CONFIRMED', paymentStatus: 'PAID', createdAt: new Date(), updatedAt: new Date(), items: [{ productId: 'product-1', name: 'Runner', quantity: 2, unitPrice: '6999.00', currency: 'INR', subtotal: '13998.00' }] },
      { id: 'order-2', merchantId: 'merchant-1', buyerId: 'buyer-2', totalAmount: '6999.00', currency: 'INR', status: 'PENDING', paymentStatus: 'PENDING', createdAt: new Date(), updatedAt: new Date(), items: [{ productId: 'product-1', name: 'Runner', quantity: 1, unitPrice: '6999.00', currency: 'INR', subtotal: '6999.00' }] },
    ] } as never,
    { getMerchantByUserId: async (userId: string) => userId === merchant.id ? { id: 'merchant-1' } : null } as never,
  );

  const result = await service.get(merchant);

  assert.equal(receivedUser, merchant);
  assert.equal(result.totalOrders, 2);
  assert.equal(result.paidOrders, 1);
  assert.equal(result.revenue, 13998);
  assert.equal(result.topSellingProducts[0]?.unitsSold, 2);
  assert.equal(result.topSellingProducts[0]?.revenue, 13998);
  assert.equal(result.lowStockProducts[0]?.id, product.id);
  assert.equal(result.inactiveProducts[0]?.id, inactive.id);
  assert.equal(result.underperformingProducts.length, 0);
});

test('buyer cannot access merchant analytics', async () => {
  const service = new MerchantAnalyticsService({} as never, {} as never, {} as never);
  await assert.rejects(
    service.get({ id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' }),
    { message: 'Merchant access required' },
  );
});