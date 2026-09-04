import assert from 'node:assert/strict';
import { test } from 'node:test';
import { errorHandler } from './errorHandler.js';

test('malformed JSON receives a safe client error', () => {
  let statusCode = 0;
  let body: unknown;
  const response = { status: (code: number) => { statusCode = code; return { json: (value: unknown) => { body = value; } }; } };
  errorHandler(Object.assign(new SyntaxError('unexpected token'), { body: {} }), {} as never, response as never, (() => undefined) as never);
  assert.equal(statusCode, 400);
  assert.deepEqual(body, { status: 'error', message: 'Malformed JSON body' });
});