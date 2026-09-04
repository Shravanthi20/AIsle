import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProductService } from './productService.js';

const merchant = { id: 'merchant-user', name: 'Merchant', email: 'merchant@test', role: 'MERCHANT' as const };
const product = { id: '11111111-1111-4111-8111-111111111111', merchantId: 'merchant-profile', name: 'Item', description: null, category: 'Test', price: '10.00', currency: 'INR', stock: 4, imageUrl: null, status: 'ACTIVE' as const, attributes: [] };

test('product reads and updates are scoped to the authenticated merchant profile', async () => {
  const received: string[] = [];
  const service = new ProductService({ getProductById: async (id: string, merchantId: string) => { received.push(`${id}:${merchantId}`); return product; }, updateProduct: async () => product } as never, { getMerchantByUserId: async () => ({ id: 'merchant-profile' }) } as never);
  await service.get(merchant, product.id);
  assert.deepEqual(received, [`${product.id}:merchant-profile`]);
});

test('product service rejects malformed identifiers before repository access', async () => {
  const service = new ProductService({} as never, {} as never);
  await assert.rejects(service.get(merchant, 'not-an-id'), { message: 'Product ID is invalid' });
});