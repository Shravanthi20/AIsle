import assert from 'node:assert/strict';
import test from 'node:test';
import { ShoppingIntentService } from './shoppingIntentService.js';

test('parses mandatory and soft shopping requirements separately', () => {
  const intent = new ShoppingIntentService().parse('I need a laptop for coding around ₹70,000, preferably lightweight');
  assert.equal(intent.budget, 70000);
  assert.equal(intent.budgetFlexibility, 0.1);
  assert.deepEqual(intent.preferredRequirements, ['lightweight']);
  assert.deepEqual(intent.useCases, ['coding']);
});
