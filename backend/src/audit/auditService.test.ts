import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuditService } from './auditService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const merchant: AuthenticatedUser = { id: 'merchant-user', name: 'Merchant', email: 'merchant@test', role: 'MERCHANT' };

test('audit log sanitizes secrets and records the event', async () => {
  let received: Record<string, unknown> | undefined;
  const service = new AuditService({ create: async (input: Record<string, unknown>) => { received = input; return { id: 'audit-1' }; } } as never, {} as never);
  await service.log({ user: buyer, buyerId: buyer.id, actorType: 'BUYER_AGENT', action: 'AGENT_REQUEST', entityType: 'AGENT', context: { password: 'hidden', apiKey: 'hidden', amount: 2000 } });
  const context = received?.context as Record<string, unknown>;
  assert.equal(context.password, undefined);
  assert.equal(context.apiKey, undefined);
  assert.equal(context.amount, 2000);
});

test('buyer and merchant audit reads use separate ownership scopes', async () => {
  const calls: string[] = [];
  const service = new AuditService({ listForBuyer: async (id: string) => { calls.push(`buyer:${id}`); return []; }, listForMerchant: async (id: string, userId: string) => { calls.push(`merchant:${id}:${userId}`); return []; } } as never, { getMerchantByUserId: async () => ({ id: 'merchant-1' }) } as never);
  await service.list(buyer);
  await service.list(merchant);
  assert.deepEqual(calls, ['buyer:buyer-1', 'merchant:merchant-1:merchant-user']);
});

test('merchant without a profile cannot read audit records', async () => {
  const service = new AuditService({} as never, { getMerchantByUserId: async () => null } as never);
  await assert.rejects(service.list(merchant), { message: 'Merchant profile not found' });
});