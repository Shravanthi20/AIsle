import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentCommerceService } from './agentCommerceService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const product = {
  product_id: 'product-1', merchant_id: 'merchant-1', name: 'Road Runner', description: 'Daily running shoe',
  category: 'Running shoes', price: 6999, currency: 'INR', availability: 'IN_STOCK' as const, stock: 4,
  status: 'ACTIVE' as const, attributes: { size: '9' }, use_cases: ['running'],
};
const otherProduct = { ...product, product_id: 'product-2', merchant_id: 'merchant-2', name: 'Other Runner' };

function buyerResponse() {
  return { message: 'I found options.', state: 'WAITING_FOR_SELECTION' as const, products: [product, otherProduct], actions: [{ type: 'add_to_cart', productId: product.product_id, label: 'Add Road Runner to cart' }] };
}

test('buyer commerce query creates verified merchant messages and forwards actions', async () => {
  let receivedAction: unknown;
  const service = new AgentCommerceService(
    { chat: async (_user: AuthenticatedUser, _message: string, action: unknown) => { receivedAction = action; return buyerResponse(); } } as never,
    { execute: async () => ({ requirements: 'running shoes under ₹8000', budget: 8000, quantity: 1, attributes: {} }) } as never,
    { execute: async (merchantId: string) => merchantId === 'merchant-1' ? [{ ...product, match_score: 1, match_reasons: [] }] : [{ ...otherProduct, match_score: 1, match_reasons: [] }] } as never,
    { list: async () => [product, otherProduct], get: async (id: string) => id === product.product_id ? product : otherProduct } as never,
    { log: () => undefined } as never,
  );
  const action = { type: 'select_product' as const, productId: product.product_id };

  const response = await service.query(buyer, { message: 'running shoes under ₹8000', action });

  assert.equal(receivedAction, action);
  assert.equal(response.messages.requests.length, 2);
  assert.equal(response.messages.responses.length, 2);
  assert.deepEqual(response.products.map((item) => item.product_id), [product.product_id, otherProduct.product_id]);
  assert.ok(response.messages.responses.every((responseMessage) => responseMessage.products.every((returnedProduct) => returnedProduct.merchant_id === responseMessage.merchantId)));
});

test('commerce query omits unavailable or unverifiable merchant products', async () => {
  const service = new AgentCommerceService(
    { chat: async () => buyerResponse() } as never,
    { execute: async () => ({ requirements: 'shoes', quantity: 1, attributes: {} }) } as never,
    { execute: async () => [{ ...product, match_score: 1, match_reasons: [] }, { ...otherProduct, match_score: 1, match_reasons: [] }] } as never,
    { list: async () => [product], get: async (id: string) => { if (id !== product.product_id) throw new Error('Product not found'); return product; } } as never,
    { log: () => undefined } as never,
  );

  const response = await service.query(buyer, { message: 'shoes' });

  assert.deepEqual(response.products.map((item) => item.product_id), [product.product_id]);
  assert.equal(response.messages.responses[0]?.products.length, 1);
});

test('buyer cannot access agent commerce', async () => {
  const service = new AgentCommerceService({} as never, {} as never, {} as never, {} as never, {} as never);
  await assert.rejects(
    service.query({ ...buyer, role: 'MERCHANT' }, { message: 'find shoes' }),
    { message: 'Buyer access required' },
  );
});