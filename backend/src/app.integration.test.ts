import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { createApp } from './app.js';

test('HTTP app protects analytics and safely rejects malformed JSON', async () => {
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const protectedResponse = await fetch(`${baseUrl}/api/analytics/merchant`);
    assert.equal(protectedResponse.status, 401);
    assert.equal(protectedResponse.headers.get('x-content-type-options'), 'nosniff');

    const malformedResponse = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformedResponse.status, 400);
    assert.deepEqual(await malformedResponse.json(), { status: 'error', message: 'Malformed JSON body' });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});