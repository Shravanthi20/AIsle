import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CartService } from './cartService.js';

test('merchant cannot access a buyer cart', async () => {
  const service = new CartService({} as never, {} as never, {} as never);
  await assert.rejects(service.get({ id: 'merchant', name: 'Merchant', email: 'merchant@test', role: 'MERCHANT' }), { message: 'Buyer access required' });
});

test('cart rejects invalid quantity and product identifiers', async () => {
  const buyer = { id: 'buyer', name: 'Buyer', email: 'buyer@test', role: 'BUYER' as const };
  const service = new CartService({} as never, {} as never, {} as never);
  await assert.rejects(service.add(buyer, 'invalid', 1), { message: 'Product ID is invalid' });
  await assert.rejects(service.add(buyer, '11111111-1111-4111-8111-111111111111', 0), { message: 'Quantity must be a positive integer' });
});