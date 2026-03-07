import assert from 'node:assert/strict';
import test from 'node:test';

import { createAccountingPositionWriteService } from '../../src/lib/application/accounting-position/service';

const itemRecord = {
  id: 'item-1',
  code: 'IT-001',
  name: 'Позиция',
  isActive: true,
  minQtyBase: null,
  synonyms: null,
  note: null,
  category: { id: 'cat-1', name: 'Категория' },
  defaultExpenseArticle: { id: 'exp-1', code: 'EA-1', name: 'Расходники' },
  defaultPurpose: { id: 'sec-1', code: 'SEC-1', name: 'Производство' },
  baseUnit: { id: 'u-1', name: 'шт' },
  defaultInputUnit: { id: 'u-1', name: 'шт' },
  reportUnit: { id: 'u-1', name: 'шт' },
};

function makeService() {
  const db = {
    $transaction: async <T>(fn: (tx: any) => Promise<T>) =>
      fn({
        item: {
          create: async () => ({
            id: 'item-1',
            code: 'IT-001',
            name: 'Позиция',
            isActive: true,
            defaultExpenseArticleId: 'exp-1',
            defaultPurposeId: 'sec-1',
          }),
          findUnique: async () => itemRecord,
        },
        itemUnit: {
          create: async () => ({}),
          findUnique: async () => ({ factorToBase: { toString: () => '1' }, isAllowed: true }),
        },
        transaction: { create: async () => ({ id: 'tx-1' }) },
        transactionLine: { create: async () => ({}) },
        auditLog: { create: async () => ({}) },
      }),
    item: {
      findUnique: async (args: any) => {
        if (args?.select?.defaultExpenseArticleId) {
          return { id: 'item-1', defaultExpenseArticleId: 'exp-1', defaultPurposeId: 'sec-1' };
        }
        return itemRecord;
      },
      update: async () => itemRecord,
    },
    itemUnit: {
      findMany: async () => [{ unitId: 'u-1' }],
    },
  };

  return createAccountingPositionWriteService({
    db: db as any,
    generateCode: async () => 'IT-001',
  });
}

test('create: blocks invariant-violating command before persistence', async () => {
  const service = makeService();
  const result = await service.create({
    name: 'Позиция',
    categoryId: 'cat',
    defaultExpenseArticleId: '',
    defaultPurposeId: 'sec',
    baseUnitId: 'u-1',
    defaultInputUnitId: 'u-1',
    reportUnitId: 'u-1',
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.kind, 'invariant');
  assert.equal(result.scenario, 'accounting-position.create');
});

test('update: success returns canonical accountingPosition with compatibility mapping', async () => {
  const service = makeService();
  const result = await service.update({ id: 'item-1', changes: { name: 'Новое имя' } });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.accountingPosition.analytics.compatibility.expenseArticleId, 'exp-1');
  assert.equal(result.data.accountingPosition.analytics.compatibility.purposeId, 'sec-1');
});

test('setActiveState: success returns updated state from use-case layer', async () => {
  const service = makeService();
  const result = await service.setActiveState({ id: 'item-1', isActive: false });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.item.id, 'item-1');
  assert.equal(result.scenario, 'accounting-position.set-active-state');
});
