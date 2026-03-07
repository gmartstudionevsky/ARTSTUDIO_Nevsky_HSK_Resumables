import { TxType } from '@prisma/client';

export type ReadProjectionKind = 'catalog' | 'stock' | 'history' | 'reports' | 'admin' | 'signals';

export interface ProjectionUpdateContract {
  projectionKinds: Array<'stock' | 'history' | 'reports' | 'signals'>;
  eventType: TxType;
  analyticsImpact: 'full' | 'stock_only';
  itemIds: string[];
  transactionId: string;
}

export interface ReadModelRecoveryContract {
  rebuildableKinds: ReadProjectionKind[];
  validateableKinds: ReadProjectionKind[];
}

export interface ProjectionUpdateReceipt {
  kind: ReadProjectionKind;
  lastEventType: TxType | null;
  lastTransactionId: string | null;
  updatedAt: string;
  stale: boolean;
}
