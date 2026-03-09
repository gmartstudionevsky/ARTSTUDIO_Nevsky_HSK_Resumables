import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeTxResult, resolveParticipatingItemIds } from '../../src/components/operation/OperationForm';

const rowBase = {
  qtyInput: '',
  unitId: 'u1',
  expenseArticleId: 'ea',
  sectionId: 's',
  comment: '',
  expanded: false,
  secondLayerExpanded: false,
  showEligibilityHint: false,
  showControlledParameters: false,
  loadingUnits: false,
  isSubmitting: false,
  error: '',
  distributions: [],
};

test('normalizeTxResult: guards post-action result rendering for incomplete line payload', () => {
  const normalized = normalizeTxResult({
    transaction: { id: 'tx-1', batchId: 'BAT-1', type: 'IN', occurredAt: new Date().toISOString() },
    lines: [
      {
        id: 'line-1',
        qtyInput: '10',
        status: 'ACTIVE',
        comment: null,
      } as any,
    ],
  } as any);

  assert.equal(normalized.lines[0]?.accountingPosition.name, 'Неизвестная позиция');
  assert.equal(normalized.lines[0]?.unit.name, '—');
  assert.equal(normalized.lines[0]?.expenseArticle.code, '—');
  assert.equal(normalized.lines[0]?.section.code, '—');
});

test('resolveParticipatingItemIds: row submit keeps single-row success scope', () => {
  const itemIds = resolveParticipatingItemIds({
    onlyItemId: 'item-1',
    rowDrafts: {
      'item-1': { ...rowBase, qtyInput: '5' },
      'item-2': { ...rowBase, qtyInput: '7', unitId: 'u2' },
    },
  });

  assert.deepEqual(itemIds, ['item-1']);
});
