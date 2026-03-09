import assert from 'node:assert/strict';
import test from 'node:test';

import { setupTestData } from './setupTestData';

test('e2e setup baseline: returns canonical identifiers', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL is required for setupTestData DB bootstrap check');
    return;
  }
  const data = await setupTestData();
  assert.ok(data.accountingPositionId);
  assert.ok(data.sectionId);
  assert.ok(data.accountingPositionName.length > 0);
  assert.equal('itemId' in (data as unknown as Record<string, unknown>), false);
  assert.equal('purposeId' in (data as unknown as Record<string, unknown>), false);
});
