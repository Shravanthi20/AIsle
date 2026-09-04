import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuthService } from './authService.js';

test('registration hashes passwords and never returns password_hash', async () => {
  let storedHash = '';
  const service = new AuthService({
    findUserByEmail: async () => null,
    createUser: async (input: { passwordHash: string }) => { storedHash = input.passwordHash; return { id: 'user-1', name: 'Buyer', email: 'buyer@test.com', role: 'BUYER' as const }; },
  } as never);
  const result = await service.register({ name: 'Buyer', email: 'Buyer@Test.com', password: 'correct horse', role: 'BUYER' });
  assert.match(storedHash, /^scrypt:/);
  assert.equal(result.user.email, 'buyer@test.com');
  assert.equal('password_hash' in result.user, false);
  assert.equal('passwordHash' in result.user, false);
});

test('login uses a generic error for invalid credentials', async () => {
  const service = new AuthService({ findUserByEmail: async () => null } as never);
  await assert.rejects(service.login({ email: 'missing@test.com', password: 'wrong-password' }), { message: 'Invalid email or password' });
});