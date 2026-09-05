import assert from 'node:assert/strict';
import test from 'node:test';
import { NextBestActionService } from './nextBestActionService.js';

test('returns DO_NOTHING when there are no relevant growth candidates', async () => {
  const service = new NextBestActionService({ recommend: async () => [] } as never, { recommend: async () => [] } as never);
  const result = await service.decide({ trigger: 'No product interaction' });
  assert.equal(result.action, 'DO_NOTHING');
  assert.equal(result.products.length, 0);
});
