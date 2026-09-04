import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAuthToken, verifyAuthToken } from './jwt.js';

const user = { id: 'user-1', name: 'Buyer', email: 'buyer@test.com', role: 'BUYER' as const };

test('JWT round trip returns only authenticated identity fields', () => {
  assert.deepEqual(verifyAuthToken(createAuthToken(user)), user);
});

test('JWT tampering is rejected', () => {
  const token = createAuthToken(user);
  const parts = token.split('.');
  parts[1] = `${parts[1]}x`;
  assert.throws(() => verifyAuthToken(parts.join('.')), { message: 'Invalid authentication token' });
});