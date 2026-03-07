import assert from 'node:assert/strict';
import test from 'node:test';
import { TxType } from '@prisma/client';

import { getPositionCatalogProjection } from '../src/lib/read-models/catalog-projection';
import { buildConsumptionReportProjectionFromRows } from '../src/lib/read-models/consumption-report-projection';
import { mapHistoryProjectionRow } from '../src/lib/read-models/history-projection';
import { mapStockProjectionRow } from '../src/lib/read-models/stock-projection';
import { getProjectionReceipts, registerProjectionUpdate } from '../src/lib/read-models/projections/update-registry';

test('catalog projection: includes availability and eligibility semantics', async () => {
  const projection = await getPositionCatalogProjection(
    {
      active: 'all',
      availability: { expenseArticle: 'required', section: 'required', controlledParameters: 'optional' },
    },
    {
      itemReader: {
        findMany: async () => [
          {
            id: 'item-1',
            code: 'IT-1',
            name: 'Item',
            isActive: true,
            minQtyBase: null,
            synonyms: null,
            note: null,
            category: { id: 'cat-1', name: 'Cat' },
            defaultExpenseArticle: { id: 'ea-1', code: 'EA', name: 'Expense' },
            defaultPurpose: { id: 'p-1', code: 'P', name: 'Purpose' },
            baseUnit: { id: 'u-1', name: 'шт' },
            defaultInputUnit: { id: 'u-1', name: 'шт' },
            reportUnit: { id: 'u-1', name: 'шт' },
          },
        ],
        count: async () => 1,
      } as never,
    },
  );

  assert.equal(projection.total, 1);
  assert.equal(projection.entries[0]?.analytics.availability.controlledParameters, 'optional');
  assert.equal(projection.entries[0]?.analytics.projectionEligibility.expandedMetrics, false);
});

test('stock projection: keeps state model with eligibility payload', () => {
  const mapped = mapStockProjectionRow({
    itemId: 'i-1',
    code: 'IT-1',
    name: 'Item',
    categoryId: 'cat-1',
    categoryName: 'Cat',
    expenseArticleId: 'ea-1',
    expenseArticleCode: 'EA',
    expenseArticleName: 'Expense',
    purposeId: 'p-1',
    purposeCode: 'P',
    purposeName: 'Purpose',
    reportUnitId: 'u-1',
    reportUnitName: 'шт',
    qtyBase: { toString: () => '5' } as never,
    qtyReport: { toString: () => '5' } as never,
    minQtyBase: { toString: () => '1' } as never,
    status: 'OK',
    isNegative: false,
    isActive: true,
    factorFallback: false,
    reportFactorToBase: { toString: () => '1' } as never,
  });

  assert.equal(mapped.qtyBase, '5');
  assert.equal((mapped as unknown as { projectionEligibility: { expandedMetrics: boolean } }).projectionEligibility.expandedMetrics, true);
});

test('history projection: classifies OPENING and INVENTORY_APPLY events', () => {
  const opening = mapHistoryProjectionRow({
    id: 'tx-1',
    batchId: 'B-1',
    type: TxType.OPENING,
    occurredAt: new Date('2025-01-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    createdById: 'u-1',
    createdByLogin: 'admin',
    note: null,
    status: 'ACTIVE',
    linesTotal: 1n,
    linesActive: 1n,
    linesCancelled: 0n,
  });

  const inventoryApply = mapHistoryProjectionRow({
    id: 'tx-2',
    batchId: 'B-2',
    type: TxType.INVENTORY_APPLY,
    occurredAt: new Date('2025-01-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    createdById: 'u-1',
    createdByLogin: 'admin',
    note: null,
    status: 'ACTIVE',
    linesTotal: 1n,
    linesActive: 1n,
    linesCancelled: 0n,
  });
  assert.equal((opening as { eventClass: string }).eventClass, 'opening');
  assert.equal((inventoryApply as { eventClass: string }).eventClass, 'inventory_apply');
});

test('consumption analytics projection: filters out non-eligible rows', () => {
  const report = buildConsumptionReportProjectionFromRows(
    [
      {
        groupId: 'ea-1',
        groupCode: 'EA',
        groupName: 'Expense',
        itemId: 'i-1',
        itemCode: 'IT-1',
        itemName: 'Item 1',
        reportUnitId: 'u-1',
        reportUnitName: 'шт',
        qtyBase: { toString: () => '10' } as never,
        qtyReport: { toString: () => '10' } as never,
        factorFallback: false,
      },
      {
        groupId: 'ea-1',
        groupCode: 'EA',
        groupName: 'Expense',
        itemId: 'i-2',
        itemCode: 'IT-2',
        itemName: 'Item 2',
        reportUnitId: 'u-1',
        reportUnitName: 'шт',
        qtyBase: { toString: () => '5' } as never,
        qtyReport: { toString: () => '5' } as never,
        factorFallback: false,
      },
    ],
    '2025-01-01',
    '2025-01-31',
    'expenseArticle',
    new Map([
      ['i-1', { expandedMetrics: true, reasons: [] }],
      ['i-2', { expandedMetrics: false, reasons: ['optional empty'] }],
    ]),
  );

  assert.equal(report.meta.rowsTotal, 1);
  assert.equal(report.groups[0]?.rows.length, 1);
});

test('projection contracts: register update from write-side handoff', () => {
  registerProjectionUpdate({
    projectionKinds: ['stock', 'history', 'reports', 'signals'],
    eventType: TxType.OUT,
    analyticsImpact: 'full',
    itemIds: ['i-1'],
    transactionId: 'tx-10',
  });

  const receipts = getProjectionReceipts();
  assert.ok(receipts.some((row) => row.kind === 'stock' && row.lastTransactionId === 'tx-10'));
  assert.ok(receipts.some((row) => row.kind === 'history' && row.lastEventType === TxType.OUT));
});

test('catalog projection: section filter is passed through canonical read-model query', async () => {
  let seenPurposeId: string | undefined;
  await getPositionCatalogProjection(
    {
      purposeId: '00000000-0000-0000-0000-000000000777',
      active: 'true',
    },
    {
      itemReader: {
        findMany: async (args: any) => {
          seenPurposeId = args.where.defaultPurposeId;
          return [];
        },
        count: async () => 0,
      } as never,
    },
  );

  assert.equal(seenPurposeId, '00000000-0000-0000-0000-000000000777');
});
