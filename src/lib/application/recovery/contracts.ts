import { TxType } from '@prisma/client';

import { ReadModelRecoveryContract, ReadProjectionKind } from '@/lib/read-models/projections/contracts';

export type RecoveryResultKind = 'success' | 'nothing_to_do' | 'validation_failure' | 'blocked' | 'unexpected_error';

export interface RecoveryContext {
  actorId?: string;
  actorRole?: string;
  correlationId?: string;
  entryPoint?: 'api' | 'admin' | 'system' | 'test';
}

export interface RecoveryTrace {
  actionId: string;
  requestedAt: string;
  context?: RecoveryContext;
}

export interface RecoveryResult<TData> {
  ok: boolean;
  kind: RecoveryResultKind;
  scenario: string;
  message: string;
  trace: RecoveryTrace;
  data?: TData;
  details?: Record<string, unknown>;
}

export interface RollbackMovementCommand {
  transactionId: string;
  reasonId?: string | null;
  note?: string | null;
  context?: RecoveryContext;
}

export interface RollbackMovementData {
  transactionId: string;
  rolledBackAt: string;
  rolledBackById: string;
  eventType: TxType;
  affectedLines: number;
  historyPreserved: true;
}

export interface ResetReadModelStateCommand {
  kinds?: ReadProjectionKind[];
  context?: RecoveryContext;
}

export interface ResetReadModelStateData {
  resetKinds: ReadProjectionKind[];
  receiptsCleared: number;
}

export interface ResyncReadModelCommand {
  kinds?: ReadProjectionKind[];
  context?: RecoveryContext;
}

export interface ResyncReadModelData {
  rebuiltKinds: ReadProjectionKind[];
  receipts: Array<{
    kind: ReadProjectionKind;
    lastTransactionId: string | null;
    lastEventType: TxType | null;
  }>;
}

export type ConsistencySeverity = 'blocking' | 'reduced_eligibility' | 'info';

export interface ConsistencyIssue {
  kind: ReadProjectionKind;
  severity: ConsistencySeverity;
  code:
    | 'MISSING_RECEIPT'
    | 'STALE_RECEIPT'
    | 'RECEIPT_EVENT_NOT_FOUND'
    | 'RECEIPT_TYPE_MISMATCH'
    | 'REDUCED_ELIGIBILITY';
  message: string;
  details?: Record<string, unknown>;
}

export interface ReadModelConsistencyReport {
  status: 'consistent' | 'inconsistent' | 'consistent_with_reduced_eligibility';
  checkedKinds: ReadProjectionKind[];
  issues: ConsistencyIssue[];
  blockingCount: number;
  reducedEligibilityCount: number;
  infoCount: number;
  recoveryContract: ReadModelRecoveryContract;
}

export interface CheckReadModelConsistencyCommand {
  kinds?: ReadProjectionKind[];
  context?: RecoveryContext;
}

export interface RecoveryService {
  rollbackMovement(command: RollbackMovementCommand): Promise<RecoveryResult<RollbackMovementData>>;
  resetReadModelState(command: ResetReadModelStateCommand): Promise<RecoveryResult<ResetReadModelStateData>>;
  resyncReadModel(command: ResyncReadModelCommand): Promise<RecoveryResult<ResyncReadModelData>>;
  checkReadModelConsistency(command?: CheckReadModelConsistencyCommand): Promise<RecoveryResult<ReadModelConsistencyReport>>;
}
