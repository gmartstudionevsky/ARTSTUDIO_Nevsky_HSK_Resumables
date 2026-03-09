import { InventoryMode, MovementType } from '@prisma/client';

import { WriteFlowContext, WriteFlowResult } from '@/lib/application/write-flow/types';
import { AccountingAnalyticsAvailabilityDraft } from '@/lib/domain/accounting-position';

export type CanonicalMovementType = 'IN' | 'OUT' | 'ADJUST';

export type InventoryApplyInterpretationMode = 'AFFECT_ANALYTICS' | 'STOCK_ONLY';

export interface EventWriteFlowLineInput {
  itemId: string;
  accountingPositionId?: string;
  qtyInput: number;
  unitId: string;
  expenseArticleId?: string | null;
  purposeId?: string | null;
  sectionId?: string | null;
  comment?: string | null;
  distributions?: Array<{
    purposeId: string;
    qtyInput: number;
  }>;
  sectionDistributions?: Array<{
    sectionId: string;
    qtyInput: number;
  }>;
}

export interface CreateAccountingMovementCommand {
  movementType: CanonicalMovementType;
  occurredAt?: string | null;
  note?: string | null;
  reasonId?: string | null;
  intakeMode?: 'SINGLE_PURPOSE' | 'DISTRIBUTE_PURPOSES' | 'SINGLE_SECTION' | 'DISTRIBUTE_SECTIONS';
  headerPurposeId?: string | null;
  headerSectionId?: string | null;
  lines: EventWriteFlowLineInput[];
  availability?: AccountingAnalyticsAvailabilityDraft;
  context?: WriteFlowContext;
}

export interface CreateOpeningEventCommand {
  occurredAt?: string | null;
  note?: string | null;
  reasonId?: string | null;
  source: 'inventory-opening' | 'position-init-opening';
  lines: Array<Omit<EventWriteFlowLineInput, 'distributions'>>;
  availability?: AccountingAnalyticsAvailabilityDraft;
  context?: WriteFlowContext;
}

export interface ApplyInventoryResultCommand {
  sessionId: string;
  note?: string | null;
  reasonId?: string | null;
  interpretationMode: InventoryApplyInterpretationMode;
  availability?: AccountingAnalyticsAvailabilityDraft;
  context?: WriteFlowContext;
}

export interface ProjectionUpdatePayload {
  projectionKinds: Array<'stock' | 'history' | 'reports' | 'signals'>;
  eventType: MovementType;
  analyticsImpact: 'full' | 'stock_only';
  itemIds: string[];
  accountingPositionIds?: string[];
  transactionId: string;
}

export interface RecoveryTrace {
  eventContextId: string;
  causalChain: string[];
  correlationId?: string;
}

export interface AccountingEventWriteResult {
  transaction: {
    id: string;
    batchId: string;
    type: MovementType;
    occurredAt: Date;
  };
  lines: Array<{
    id: string;
    itemId: string;
    accountingPositionId?: string;
    qtyInput: string;
    qtyBase: string;
    unitId: string;
    expenseArticleId: string;
    purposeId: string;
    sectionId?: string;
    compatibility: {
      expenseArticleId: string | null;
      purposeId: string | null;
      sectionId?: string | null;
    };
  }>;
  warnings?: Array<{ code: 'NEGATIVE_STOCK'; message: string; itemId: string; itemName: string; accountingPositionId?: string; accountingPositionName?: string }>;
  projection: ProjectionUpdatePayload;
  recovery: RecoveryTrace;
  inventory?: {
    sessionId: string;
    mode: InventoryMode;
    interpretationMode: InventoryApplyInterpretationMode;
    appliedLines: number;
  };
}

export type AccountingEventUseCaseResult = WriteFlowResult<AccountingEventWriteResult>;

export interface AccountingEventWriteService {
  createMovement(command: CreateAccountingMovementCommand): Promise<AccountingEventUseCaseResult>;
  createOpening(command: CreateOpeningEventCommand): Promise<AccountingEventUseCaseResult>;
  applyInventoryResult(command: ApplyInventoryResultCommand): Promise<AccountingEventUseCaseResult>;
}
