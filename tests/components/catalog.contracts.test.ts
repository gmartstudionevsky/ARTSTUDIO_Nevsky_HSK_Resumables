import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogListQuery, extractCreatedAccountingPosition } from '@/components/catalog/contracts';

test('buildCatalogListQuery omits empty filter params', () => {
  const query = buildCatalogListQuery({
    q: '',
    categoryId: '',
    expenseArticleId: '',
    active: 'true',
  });

  assert.equal(query.includes('categoryId='), false);
  assert.equal(query.includes('expenseArticleId='), false);
  assert.equal(query.includes('active=true'), true);
  assert.equal(query.includes('limit=100'), true);
});

test('extractCreatedAccountingPosition parses canonical POST payload', () => {
  const parsed = extractCreatedAccountingPosition({
    accountingPosition: { id: '11111111-1111-1111-1111-111111111111' },
    transactionId: '22222222-2222-2222-2222-222222222222',
  });

  assert.deepEqual(parsed, {
    id: '11111111-1111-1111-1111-111111111111',
    transactionId: '22222222-2222-2222-2222-222222222222',
  });
});

test('extractCreatedAccountingPosition returns null for legacy-only payload', () => {
  const parsed = extractCreatedAccountingPosition({ item: { id: 'legacy' } });
  assert.equal(parsed, null);
});
