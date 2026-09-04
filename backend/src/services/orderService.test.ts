import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OrderService } from './orderService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const order = { id: 'order-1', buyerId: buyer.id, merchantId: 'merchant-1', totalAmount: '2000.00', currency: 'INR', status: 'PENDING' as const, paymentStatus: 'PENDING' as const, createdAt: new Date(), updatedAt: new Date() };

function service(decision: 'ALLOW' | 'REQUIRES_APPROVAL', received: { amount?: number; approvalId?: string }) {
  return new OrderService(
    { checkout: async (_buyerId: string, approvalId?: string) => { received.approvalId = approvalId; return { order, items: [] }; } } as never,
    {} as never,
    {} as never,
    { get: async () => ({ items: [{ merchantId: 'merchant-1' }], subtotal: '2000.00', currency: 'INR' }) } as never,
    { evaluate: async (_user: AuthenticatedUser, _action: string, amount: number) => { received.amount = amount; return { decision }; } } as never,
  );
}

test('checkout evaluates the authoritative backend cart amount and allows within-limit purchase', async () => {
  const received: { amount?: number; approvalId?: string } = {};
  const result = await service('ALLOW', received).checkout(buyer);
  assert.equal(received.amount, 2000);
  assert.equal(received.approvalId, undefined);
  assert.equal(result.id, order.id);
});

test('checkout blocks above-limit purchase until an approval is supplied', async () => {
  const received: { amount?: number; approvalId?: string } = {};
  await assert.rejects(service('REQUIRES_APPROVAL', received).checkout(buyer), { message: 'Approval is required before checkout' });
  assert.equal(received.amount, 2000);
  await service('REQUIRES_APPROVAL', received).checkout(buyer, 'approval-1');
  assert.equal(received.approvalId, 'approval-1');
});