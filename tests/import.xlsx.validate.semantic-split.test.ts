import assert from 'node:assert/strict';
import test from 'node:test';

import { validateImportData } from '../src/lib/import/xlsx/validate';

test('validateImportData: counts sections and expense articles independently', () => {
  const payload = validateImportData({
    parseErrors: [],
    directoryRows: [
      {
        rowNumber: 2,
        code: 'IT-001',
        name: 'Позиция 1',
        sectionCode: 'SEC-A',
        baseUnit: 'шт',
        defaultInputUnit: 'шт',
        reportUnit: 'шт',
        minQtyBase: null,
        openingQty: 0,
        expenseArticleCode: 'EA-1',
        isActive: true,
        synonyms: null,
        note: null,
      },
      {
        rowNumber: 3,
        code: 'IT-002',
        name: 'Позиция 2',
        sectionCode: 'SEC-B',
        baseUnit: 'шт',
        defaultInputUnit: 'шт',
        reportUnit: 'шт',
        minQtyBase: null,
        openingQty: 0,
        expenseArticleCode: 'EA-1',
        isActive: true,
        synonyms: null,
        note: null,
      },
    ],
    unitRows: [],
  });

  assert.equal(payload.summary.sections, 2);
  assert.equal(payload.summary.purposes, 2);
  assert.equal(payload.summary.expenseArticles, 1);
});
