import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApprovalService } from './approvalService.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { Approval } from '../types/approval.js';

const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const approval: Approval = { id: 'approval-1', buyerId: buyer.id, action: 'PURCHASE', amount: 8000, currency: 'INR', cartSnapshot: {}, status: 'PENDING', expiresAt: new Date(Date.now() + 60_000), approvedAt: null, rejectedAt: null, createdAt: new Date(), updatedAt: new Date() };

test('approval is created from the backend cart total and can be approved once', async () => {
  let createdAmount = 0;
  let current = approval;
  const service = new ApprovalService(
    { create: async (input: { amount: number }) => { createdAmount = input.amount; return current; }, getById: async () => current, decide: async (_id: string, _buyerId: string, status: 'APPROVED' | 'REJECTED') => { current = { ...current, status }; return current; } } as never,
    { get: async () => ({ items: [{ merchantId: 'merchant-1' }], subtotal: '8000.00', currency: 'INR' }) } as never,
    { evaluate: async () => ({ decision: 'REQUIRES_APPROVAL' }) } as never,
  );
  const created = await service.create(buyer);
  assert.equal(createdAmount, 8000);
  assert.equal(created.id, approval.id);
  assert.equal((await service.approve(buyer, approval.id)).status, 'APPROVED');
  await assert.rejects(service.approve(buyer, approval.id), { message: 'Approval has already been decided or expired' });
});

test('wrong buyer cannot approve another buyer approval', async () => {
  const service = new ApprovalService({ getById: async () => null } as never, {} as never, {} as never);
  await assert.rejects(service.approve(buyer, 'approval-2'), { message: 'Approval not found' });
});

test('rejected approval cannot be approved', async () => {
  const rejected = { ...approval, status: 'REJECTED' as const };
  const service = new ApprovalService({ getById: async () => rejected } as never, {} as never, {} as never);
  await assert.rejects(service.approve(buyer, rejected.id), { message: 'Approval has already been decided or expired' });
});