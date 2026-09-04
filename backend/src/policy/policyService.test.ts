import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PolicyService } from './policyService.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { Policy } from '../types/policy.js';

const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const policy: Policy = { id: 'policy-1', buyerId: buyer.id, merchantId: null, maxPurchaseAmount: 5000, approvalRequired: true, allowedActions: ['PURCHASE'], blockedActions: [], createdAt: new Date(), updatedAt: new Date() };

function service(current = policy) {
  return new PolicyService({ getByBuyer: async () => current, create: async () => current } as never);
}

test('policy allows an action within the automatic limit', async () => {
  const result = await service().evaluate(buyer, 'PURCHASE', 2000, 'INR');
  assert.equal(result.decision, 'ALLOW');
});

test('policy requires approval above the automatic limit', async () => {
  const result = await service().evaluate(buyer, 'PURCHASE', 15000, 'INR');
  assert.equal(result.decision, 'REQUIRES_APPROVAL');
});

test('blocked actions are denied by policy', async () => {
  const result = await service({ ...policy, blockedActions: ['PURCHASE'] }).evaluate(buyer, 'PURCHASE', 100, 'INR');
  assert.equal(result.decision, 'DENY');
});

test('buyer role is required for policy evaluation', async () => {
  await assert.rejects(service().evaluate({ ...buyer, role: 'MERCHANT' }, 'PURCHASE', 100, 'INR'), { message: 'Buyer access required' });
});