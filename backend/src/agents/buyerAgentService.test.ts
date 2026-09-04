import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BuyerAgentService } from './buyerAgentService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const user: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const product = { product_id: 'product-1', merchant_id: 'merchant-1', name: 'Black Runner', description: 'Daily shoe', category: 'Running shoes', price: 6999, currency: 'INR', availability: 'IN_STOCK' as const, stock: 4, status: 'ACTIVE' as const, attributes: { color: 'black', size: '9' }, use_cases: ['running'] };

test('agent returns only products supplied by search and calls recommendations', async () => {
  let recommended = false;
  const service = new BuyerAgentService(
    { execute: async () => [product] } as never,
    { execute: async () => { recommended = true; return []; } } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const response = await service.chat(user, 'black running shoes under ₹8000, size 9');
  assert.equal(response.products[0]?.name, 'Black Runner');
  assert.equal(recommended, true);
});

test('agent uses recommendation results to rank and explain search results', async () => {
  const secondProduct = { ...product, product_id: 'product-2', name: 'Blue Runner' };
  const service = new BuyerAgentService(
    { execute: async () => [product, secondProduct] } as never,
    { execute: async () => [{ ...secondProduct, score: 0.92, reason: 'it supports daily running and fits your budget', matched_requirements: [], tradeoffs: [] }, { ...product, score: 0.81, reason: 'it is also suitable for running', matched_requirements: [], tradeoffs: [] }] } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const response = await service.chat({ ...user, id: 'buyer-2' }, 'daily running shoes under ₹8000, size 9');

  assert.equal(response.products[0]?.product_id, secondProduct.product_id);
  assert.match(response.message, /Blue Runner/);
  assert.match(response.message, /supports daily running/);
});

test('agent delegates add-to-cart using the authenticated buyer', async () => {
  let receivedUser: AuthenticatedUser | undefined;
  const service = new BuyerAgentService(
    { execute: async () => [product] } as never,
    { execute: async () => [] } as never,
    { execute: async () => product } as never,
    { execute: async (buyer: AuthenticatedUser) => { receivedUser = buyer; return { items: [], subtotal: '0.00', currency: 'INR' }; } } as never,
    {} as never,
    {} as never,
  );
  await service.chat(user, 'find running shoes');
  await service.chat(user, 'add the first one to my cart', { type: 'add_to_cart', productId: product.product_id });
  assert.equal(receivedUser, user);
});

test('agent reports checkout failures without inventing an order or payment success', async () => {
  const service = new BuyerAgentService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { execute: async () => { throw new Error('Requested quantity exceeds available stock'); } } as never,
  );
  const response = await service.chat(user, 'checkout now');
  assert.equal(response.state, 'ERROR');
  assert.match(response.message, /no longer available|insufficient stock/i);
  assert.doesNotMatch(response.message, /paid|confirmed|successful/i);
});