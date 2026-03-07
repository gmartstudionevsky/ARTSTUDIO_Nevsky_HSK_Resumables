import { TxType } from '@prisma/client';

import { ProjectionUpdateContract, ProjectionUpdateReceipt, ReadModelRecoveryContract, ReadProjectionKind } from '@/lib/read-models/projections/contracts';

const projectionKindMap: Record<ProjectionUpdateContract['projectionKinds'][number], ReadProjectionKind> = {
  stock: 'stock',
  history: 'history',
  reports: 'reports',
  signals: 'signals',
};

const projectionReceipts = new Map<ReadProjectionKind, ProjectionUpdateReceipt>();

function markProjectionUpdated(kind: ReadProjectionKind, eventType: TxType, transactionId: string): ProjectionUpdateReceipt {
  const receipt: ProjectionUpdateReceipt = {
    kind,
    lastEventType: eventType,
    lastTransactionId: transactionId,
    updatedAt: new Date().toISOString(),
    stale: false,
  };
  projectionReceipts.set(kind, receipt);
  return receipt;
}

export function registerProjectionUpdate(contract: ProjectionUpdateContract): ProjectionUpdateReceipt[] {
  return contract.projectionKinds.map((projectionKind) =>
    markProjectionUpdated(projectionKindMap[projectionKind], contract.eventType, contract.transactionId),
  );
}

export function markProjectionStale(kind: ReadProjectionKind): void {
  const existing = projectionReceipts.get(kind);
  if (!existing) return;
  projectionReceipts.set(kind, { ...existing, stale: true });
}

export function getProjectionReceipts(): ProjectionUpdateReceipt[] {
  return Array.from(projectionReceipts.values()).sort((a, b) => a.kind.localeCompare(b.kind));
}

export function getReadModelRecoveryContract(): ReadModelRecoveryContract {
  return {
    rebuildableKinds: ['catalog', 'stock', 'history', 'reports', 'admin', 'signals'],
    validateableKinds: ['catalog', 'stock', 'history', 'reports', 'admin'],
  };
}
