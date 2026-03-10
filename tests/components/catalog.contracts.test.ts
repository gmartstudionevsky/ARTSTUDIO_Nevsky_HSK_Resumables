import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogListQuery, extractCatalogDetailsItem, extractCreatedAccountingPosition } from '@/components/catalog/contracts';

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

test('extractCatalogDetailsItem parses canonical accountingPosition payload', () => {
  const parsed = extractCatalogDetailsItem({
    accountingPosition: {
      id: 'a',
      code: 'AP-1',
      name: 'Position',
      isActive: true,
      categoryId: 'cat',
      defaultExpenseArticleId: 'ea',
      defaultSectionId: 'sec',
      baseUnitId: 'u1',
      defaultInputUnitId: 'u1',
      reportUnitId: 'u1',
      minQtyBase: '0',
      synonyms: null,
      note: null,
    },
  });

  assert.equal(parsed?.id, 'a');
  assert.equal(parsed?.code, 'AP-1');
});

test('extractCatalogDetailsItem supports legacy item payload as compatibility fallback', () => {
  const parsed = extractCatalogDetailsItem({
    item: {
      id: 'b',
      code: 'IT-1',
      name: 'Legacy',
      isActive: false,
      categoryId: 'cat',
      defaultExpenseArticleId: 'ea',
      defaultSectionId: 'sec',
      baseUnitId: 'u1',
      defaultInputUnitId: 'u1',
      reportUnitId: 'u1',
      minQtyBase: null,
      synonyms: 'x',
      note: null,
    },
  });

  assert.equal(parsed?.id, 'b');
  assert.equal(parsed?.name, 'Legacy');
});
