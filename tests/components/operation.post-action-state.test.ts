import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCorrectionPatch, buildPostActionState, canPrepareCorrection } from '../../src/components/operation/post-action-state';
import { ActionRowDraft } from '../../src/components/operation/action-row-state';
import { TxLineView } from '../../src/lib/operation/types';

test('buildPostActionState: keeps single-row and multi-row mode explicit', () => {
  const base = {
    transaction: { id: 'tx-1', batchId: 'B-1', type: 'IN' as const, occurredAt: new Date().toISOString() },
    lines: [],
  };

  assert.equal(buildPostActionState(base, ['i-1']).mode, 'single');
  assert.equal(buildPostActionState(base, ['i-1', 'i-2']).mode, 'multi');
});

test('buildCorrectionPatch: rehydrates row draft from recent result line', () => {
  const line: TxLineView = {
    id: 'line-1',
    qtyInput: '12.5',
    status: 'ACTIVE',
    comment: 'note',
    item: { id: 'item-1', code: 'I-1', name: 'Item 1' },
    unit: { id: 'u-1', name: 'шт' },
    expenseArticle: { id: 'ea-1', code: 'EA', name: 'Expense' },
    purpose: { id: 'p-1', code: 'P', name: 'Purpose' },
  };

  assert.deepEqual(buildCorrectionPatch(line), {
    qtyInput: '12.5',
    unitId: 'u-1',
    expenseArticleId: 'ea-1',
    purposeId: 'p-1',
    comment: 'note',
    expanded: true,
    error: '',
  });
});

test('canPrepareCorrection: allows local correction only for rows in current workspace', () => {
  const rowDraft: ActionRowDraft = {
    qtyInput: '',
    unitId: '',
    expenseArticleId: '',
    purposeId: '',
    comment: '',
    expanded: false,
    loadingUnits: false,
    isSubmitting: false,
    error: '',
    distributions: [],
  };

  const line: TxLineView = {
    id: 'line-1',
    qtyInput: '1',
    status: 'ACTIVE',
    comment: null,
    item: { id: 'item-a', code: 'A', name: 'A' },
    unit: { id: 'u', name: 'шт' },
    expenseArticle: { id: 'ea', code: 'EA', name: 'EA' },
    purpose: { id: 'p', code: 'P', name: 'P' },
  };

  assert.equal(canPrepareCorrection(line, { 'item-a': rowDraft }), true);
  assert.equal(canPrepareCorrection(line, { 'item-b': rowDraft }), false);
});
