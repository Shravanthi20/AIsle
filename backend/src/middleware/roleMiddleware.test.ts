import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireRole } from './roleMiddleware.js';

test('role middleware rejects cross-role access', () => {
  let received: unknown;
  requireRole('MERCHANT')({ user: { id: 'buyer', name: 'Buyer', email: 'buyer@test', role: 'BUYER' } } as never, {} as never, (error?: unknown) => { received = error; });
  assert.equal((received as Error).message, 'You do not have access to this resource');
});