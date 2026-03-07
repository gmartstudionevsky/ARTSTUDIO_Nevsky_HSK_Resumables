import assert from 'node:assert/strict';
import test from 'node:test';
import { RecordStatus, TxType } from '@prisma/client';

import { createRecoveryService } from '../../src/lib/application/recovery';
import { clearProjectionReceipts, setProjectionReceipt } from '../../src/lib/read-models';

type FakeTx = {
  id: string;
  type: TxType;
  status: RecordStatus;
  createdAt: Date;
  occurredAt: Date;
};

type FakeItem = { id: string; code: string; name: string; updatedAt: Date; isActive: boolean };

type FakeLine = { id: string; transactionId: string; status: RecordStatus };

function createFakeDeps(seed?: { transactions?: FakeTx[]; items?: FakeItem[]; lines?: FakeLine[]; queryRows?: Array<{ itemId: string; itemCode: string; itemName: string; reportUnitAllowed: boolean }> }) {
  const transactions = [...(seed?.transactions ?? [])];
  const items = [...(seed?.items ?? [])];
  const lines = [...(seed?.lines ?? [])];
  const queryRows = seed?.queryRows ?? [];
  const auditLogs: Array<{ action: string; entityId: string | null }> = [];

  const txClient = {
    transactionLine: {
      updateMany: async ({ where, data }: { where: { transactionId: string; status: RecordStatus }; data: Partial<FakeLine> }) => {
        let count = 0;
        for (const row of lines) {
          if (row.transactionId === where.transactionId && row.status === where.status) {
            row.status = data.status as RecordStatus;
            count += 1;
          }
        }
        return { count };
      },
    },
    transaction: {
      update: async ({ where, data }: { where: { id: string }; data: Partial<FakeTx> }) => {
        const row = transactions.find((tx) => tx.id === where.id);
        if (!row) throw new Error('not found');
        row.status = data.status as RecordStatus;
        return row;
      },
    },
    auditLog: {
      create: async ({ data }: { data: { action: string; entityId?: string | null } }) => {
        auditLogs.push({ action: data.action, entityId: data.entityId ?? null });
      },
    },
  };

  return {
    db: {
      $transaction: async <T>(fn: (tx: typeof txClient) => Promise<T>) => fn(txClient),
      transaction: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          transactions.find((tx) => tx.id === where.id)
            ? { ...transactions.find((tx) => tx.id === where.id)! }
            : null,
        findFirst: async () => {
          const sorted = [...transactions].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
          const first = sorted[0];
          return first ? { id: first.id, type: first.type } : null;
        },
      },
      transactionLine: {},
      item: {
        findFirst: async () => {
          const sorted = [...items].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          return sorted[0] ? { id: sorted[0].id } : null;
        },
        findUnique: async ({ where }: { where: { id: string } }) => {
          const row = items.find((item) => item.id === where.id);
          return row ? { id: row.id } : null;
        },
      },
      $queryRaw: async () => queryRows,
    },
    state: { transactions, lines, auditLogs },
  };
}

test('rollback movement cancels records but preserves history', async () => {
  const deps = createFakeDeps({
    transactions: [{ id: 'tx-1', type: TxType.OUT, status: RecordStatus.ACTIVE, createdAt: new Date(), occurredAt: new Date() }],
    lines: [
      { id: 'ln-1', transactionId: 'tx-1', status: RecordStatus.ACTIVE },
      { id: 'ln-2', transactionId: 'tx-1', status: RecordStatus.ACTIVE },
    ],
  });
  const service = createRecoveryService(deps as never);

  const result = await service.rollbackMovement({ transactionId: 'tx-1', context: { actorId: 'u-1', entryPoint: 'test' } });
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'success');
  assert.equal(result.data?.historyPreserved, true);
  assert.equal(deps.state.transactions[0]?.status, RecordStatus.CANCELLED);
  assert.equal(deps.state.lines.every((line) => line.status === RecordStatus.CANCELLED), true);
  assert.equal(deps.state.auditLogs.some((entry) => entry.action === 'ROLLBACK_MOVEMENT'), true);
  assert.equal(deps.state.transactions.length, 1);
});

test('rollback blocks non-movement transaction types', async () => {
  const deps = createFakeDeps({
    transactions: [{ id: 'tx-opening', type: TxType.OPENING, status: RecordStatus.ACTIVE, createdAt: new Date(), occurredAt: new Date() }],
  });
  const service = createRecoveryService(deps as never);
  const result = await service.rollbackMovement({ transactionId: 'tx-opening', context: { actorId: 'u-1', entryPoint: 'test' } });

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'blocked');
});

test('reset and resync projection receipts', async () => {
  clearProjectionReceipts(['catalog', 'stock', 'history', 'reports', 'admin', 'signals']);
  setProjectionReceipt('stock', TxType.IN, 'tx-old');

  const deps = createFakeDeps({
    transactions: [{ id: 'tx-new', type: TxType.OUT, status: RecordStatus.ACTIVE, createdAt: new Date(), occurredAt: new Date() }],
    items: [{ id: 'item-1', code: 'I1', name: 'Item', updatedAt: new Date(), isActive: true }],
  });
  const service = createRecoveryService(deps as never);

  const resetResult = await service.resetReadModelState({ kinds: ['stock'], context: { actorId: 'u-1', entryPoint: 'test' } });
  assert.equal(resetResult.ok, true);
  assert.equal(resetResult.data?.receiptsCleared, 1);

  const resyncResult = await service.resyncReadModel({ kinds: ['stock', 'catalog'], context: { actorId: 'u-1', entryPoint: 'test' } });
  assert.equal(resyncResult.ok, true);
  assert.equal(resyncResult.data?.rebuiltKinds.includes('stock'), true);
  assert.equal(resyncResult.data?.receipts.find((row) => row.kind === 'stock')?.lastTransactionId, 'tx-new');
});

test('consistency checker detects blocking inconsistencies', async () => {
  clearProjectionReceipts(['catalog', 'stock', 'history', 'reports', 'admin', 'signals']);
  const deps = createFakeDeps();
  const service = createRecoveryService(deps as never);

  const report = await service.checkReadModelConsistency({ kinds: ['stock', 'history'], context: { actorId: 'u-1', entryPoint: 'test' } });
  assert.equal(report.ok, true);
  assert.equal(report.data?.status, 'inconsistent');
  assert.equal((report.data?.issues ?? []).some((issue) => issue.code === 'MISSING_RECEIPT'), true);
});

test('consistency checker returns reduced eligibility as non-blocking informational state', async () => {
  clearProjectionReceipts(['catalog', 'stock', 'history', 'reports', 'admin', 'signals']);
  setProjectionReceipt('stock', TxType.OUT, 'tx-1');
  setProjectionReceipt('history', TxType.OUT, 'tx-1');
  setProjectionReceipt('reports', TxType.OUT, 'tx-1');
  const deps = createFakeDeps({
    transactions: [{ id: 'tx-1', type: TxType.OUT, status: RecordStatus.ACTIVE, createdAt: new Date(), occurredAt: new Date() }],
    queryRows: [{ itemId: 'item-1', itemCode: 'IT-1', itemName: 'Item', reportUnitAllowed: false }],
  });
  const service = createRecoveryService(deps as never);

  const report = await service.checkReadModelConsistency({ kinds: ['stock', 'history', 'reports'], context: { actorId: 'u-1', entryPoint: 'test' } });
  assert.equal(report.ok, true);
  assert.equal(report.data?.blockingCount, 0);
  assert.equal(report.data?.status, 'consistent_with_reduced_eligibility');
  assert.equal((report.data?.issues ?? []).some((issue) => issue.code === 'REDUCED_ELIGIBILITY'), true);
});
