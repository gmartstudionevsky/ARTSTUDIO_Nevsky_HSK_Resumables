import assert from 'node:assert/strict';
import test from 'node:test';

import { InventoryMode, InventoryStatus, Prisma, TxType } from '@prisma/client';

import { createAccountingEventWriteService } from '../../src/lib/application/accounting-event';

function makeService(overrides?: Partial<Parameters<typeof createAccountingEventWriteService>[0]>) {
  const tx = {
    itemUnit: {
      findMany: async () => [
        {
          itemId: 'item-1',
          unitId: 'u-1',
          factorToBase: new Prisma.Decimal(1),
          item: {
            id: 'item-1',
            code: 'IT-1',
            name: 'Позиция',
            isActive: true,
            minQtyBase: null,
            synonyms: null,
            note: null,
            category: { id: 'cat-1', name: 'Категория' },
            defaultExpenseArticle: { id: 'exp-1', code: 'EA-1', name: 'Расход' },
            defaultPurpose: { id: 'pur-1', code: 'P-1', name: 'Раздел' },
            baseUnit: { id: 'u-1', name: 'шт' },
            defaultInputUnit: { id: 'u-1', name: 'шт' },
            reportUnit: { id: 'u-1', name: 'шт' },
          },
        },
      ],
    },
    transaction: {
      create: async ({ data }: any) => ({ id: 'tx-1', batchId: data.batchId, type: data.type, occurredAt: data.occurredAt }),
      findUnique: async () => ({ id: 'tx-1', batchId: 'BAT-1', type: TxType.IN, occurredAt: new Date() }),
    },
    transactionLine: {
      createMany: async () => ({}),
      findMany: async () => [
        {
          id: 'line-1',
          itemId: 'item-1',
          qtyInput: { toString: () => '5' },
          qtyBase: { toString: () => '5' },
          unitId: 'u-1',
          expenseArticleId: 'exp-1',
          purposeId: 'pur-1',
        },
      ],
    },
    auditLog: { create: async () => ({}) },
    inventorySession: {
      findUnique: async () => ({
        id: 'inv-1',
        mode: InventoryMode.REGULAR,
        status: InventoryStatus.DRAFT,
        occurredAt: new Date(),
        lines: [
          {
            itemId: 'item-1',
            unitId: 'u-1',
            qtySystemBase: { sub: () => ({ eq: () => false, toString: () => '0', toFixed: () => '0' }) },
            qtyFactBase: { sub: () => ({ eq: () => false, toString: () => '2', toFixed: () => '2' }) },
            qtyFactInput: null,
            comment: null,
            item: {
              id: 'item-1',
              code: 'IT-1',
              name: 'Позиция',
              isActive: true,
              minQtyBase: null,
              synonyms: null,
              note: null,
              category: { id: 'cat-1', name: 'Категория' },
              defaultExpenseArticle: { id: 'exp-1', code: 'EA-1', name: 'Расход' },
              defaultPurpose: { id: 'pur-1', code: 'P-1', name: 'Раздел' },
              baseUnit: { id: 'u-1', name: 'шт' },
              defaultInputUnit: { id: 'u-1', name: 'шт' },
              reportUnit: { id: 'u-1', name: 'шт' },
            },
          },
        ],
      }),
      update: async () => ({}),
    },
  } as any;

  const db = {
    $transaction: async <T>(fn: (t: any) => Promise<T>) => fn(tx),
    itemUnit: tx.itemUnit,
    inventorySession: tx.inventorySession,
  } as any;

  return createAccountingEventWriteService({
    db,
    getSettings: async () => ({ allowNegativeStock: true, supervisorBackdateDays: 1, requireReasonOnCancel: false, displayDecimals: 2, enablePeriodLocks: true }),
    getCurrentQtyBaseByItemIds: async () => new Map(),
    isDateLocked: async () => false,
    ...overrides,
  });
}

test('movement: creates canonical IN movement via use-case contract', async () => {
  const service = makeService();
  const result = await service.createMovement({
    movementType: TxType.IN,
    lines: [{ itemId: 'item-1', qtyInput: 5, unitId: 'u-1' }],
    context: { actorId: 'user-1', actorRole: 'ADMIN' },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.transaction.type, TxType.IN);
  assert.equal(result.data.projection.eventType, TxType.IN);
});

test('opening: semantic guard blocks OPENING in regular movement use-case', async () => {
  const service = makeService();
  const result = await service.createMovement({
    movementType: 'OPENING' as any,
    lines: [{ itemId: 'item-1', qtyInput: 1, unitId: 'u-1' }],
    context: { actorId: 'user-1', actorRole: 'ADMIN' },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.kind, 'domain_semantic');
});

test('inventory apply: returns interpretation mode and projection contract', async () => {
  const service = makeService();
  const result = await service.applyInventoryResult({
    sessionId: 'inv-1',
    interpretationMode: 'STOCK_ONLY',
    context: { actorId: 'user-1', actorRole: 'ADMIN' },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.inventory?.interpretationMode, 'STOCK_ONLY');
  assert.equal(result.data.projection.analyticsImpact, 'stock_only');
});

test('compatibility mapping/invariants: required axis absence fails', async () => {
  const service = makeService({
    db: {
      $transaction: async <T>(fn: (t: any) => Promise<T>) =>
        fn({
          itemUnit: {
            findMany: async () => [
              {
                itemId: 'item-1',
                unitId: 'u-1',
                factorToBase: new Prisma.Decimal(1),
                item: {
                  id: 'item-1',
                  code: 'IT-1',
                  name: 'Позиция',
                  isActive: true,
                  minQtyBase: null,
                  synonyms: null,
                  note: null,
                  category: { id: 'cat-1', name: 'Категория' },
                  defaultExpenseArticle: { id: '', code: '', name: '' },
                  defaultPurpose: { id: 'pur-1', code: 'P-1', name: 'Раздел' },
                  baseUnit: { id: 'u-1', name: 'шт' },
                  defaultInputUnit: { id: 'u-1', name: 'шт' },
                  reportUnit: { id: 'u-1', name: 'шт' },
                },
              },
            ],
          },
          transaction: { create: async () => ({ id: 'tx-1' }), findUnique: async () => null },
          transactionLine: { createMany: async () => ({}), findMany: async () => [] },
          auditLog: { create: async () => ({}) },
        }),
      itemUnit: { findMany: async () => [] },
      inventorySession: { findUnique: async () => null },
    } as any,
  });

  const result = await service.createMovement({
    movementType: TxType.IN,
    lines: [{ itemId: 'item-1', qtyInput: 5, unitId: 'u-1' }],
    context: { actorId: 'user-1', actorRole: 'ADMIN' },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.kind, 'invariant');
});
